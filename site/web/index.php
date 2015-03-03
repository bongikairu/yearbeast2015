<?php

require('../vendor/autoload.php');

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\HttpKernelInterface;

$app = new Silex\Application();
$app['debug'] = true;

// Register the monolog logging service
$app->register(new Silex\Provider\MonologServiceProvider(), array(
	'monolog.logfile' => 'php://stderr',
));

// template engine
$app->register(new Silex\Provider\TwigServiceProvider(), array(
	'twig.path' => __DIR__.'/views',
));

// database
$dbconnstr = getenv("CLEARDB_DATABASE_URL");
$dbconn = parse_url($dbconnstr);
$app->register(new Silex\Provider\DoctrineServiceProvider(), array(
	'db.options' => array(
		'driver'    => 'pdo_mysql',
		'host'      => $dbconn["host"],
		'dbname'    => substr($dbconn["path"], 1),
		'user'      => $dbconn["user"],
		'password'  => $dbconn["pass"],
		'charset'   => 'utf8',
	),
));

// cache
//$redisconnstr = getenv("REDISTOGO_URL");
$redisconnstr = getenv("REDISCLOUD_URL");
$redisconn = parse_url($redisconnstr);
$app->register(new Predis\Silex\ClientServiceProvider(), [
    'predis.parameters' => array(
	    'scheme'   => 'tcp',
	    'host'     => $redisconn["host"],
	    'port'     => $redisconn["port"],
	    'password' => $redisconn["pass"]
	),
    'predis.options'    => [
        'prefix'  => 'silex:',
        'profile' => '3.0',
    ],
]);

// locales
$app->register(new Silex\Provider\TranslationServiceProvider(), array(
    'locale_fallbacks' => array('en'),
//    'locale' => array('th'),
));

$app['translator'] = $app->share($app->extend('translator', function($translator, $app) {
    $translator->addResource('xliff', __DIR__.'/locales/en.xliff', 'en');
	$translator->addResource('xliff', __DIR__.'/locales/th.xliff', 'th');
	$translator->addResource('xliff', __DIR__.'/locales/fa.xliff', 'fa');
	$translator->addResource('xliff', __DIR__.'/locales/ru.xliff', 'ru');
	$translator->addResource('xliff', __DIR__.'/locales/pt_BR.xliff', 'pt_BR');
	$translator->addResource('xliff', __DIR__.'/locales/es_AR.xliff', 'es_AR');
	$translator->addResource('xliff', __DIR__.'/locales/vi.xliff', 'vi');
	$translator->addResource('xliff', __DIR__.'/locales/de.xliff', 'de');
	$translator->addResource('xliff', __DIR__.'/locales/pl.xliff', 'pl');
	$translator->addResource('xliff', __DIR__.'/locales/uk.xliff', 'uk');
	$translator->addResource('xliff', __DIR__.'/locales/fil.xliff', 'fil');
	$translator->addResource('xliff', __DIR__.'/locales/tr.xliff', 'tr');
	$translator->addResource('xliff', __DIR__.'/locales/cs.xliff', 'cs');
    return $translator;
}));

// Our web handlers
$app->get('/', function () use ($app) {
    $subRequest = Request::create('/l/en', 'GET');
    return $app->handle($subRequest, HttpKernelInterface::SUB_REQUEST);
});

$app->get('/locale/{l}', function ($l) use ($app) {
    $subRequest = Request::create('/l/'.$l, 'GET');
    return $app->handle($subRequest, HttpKernelInterface::SUB_REQUEST);
});

$app->get('/l/{_locale}', function() use($app) {
	
	$datastr = $app['predis']->get('beastdatashort');
	$data = unserialize($datastr);
	
	$rendervar = array();
	$rendervar['beast'] = $data;

	// current beast check
	$rendervar['status'] = "dormant";
	//$rendervar['statustext'] = "Year Beast lies dormant";
	if($data[0]) {
		$cur = time();
		$rendervar['servertime'] = $cur;
		$event = $data[0]['timestamp'];
		$duration = $data[0]['duration'];
		if($cur>$event+$duration) {
			$rendervar['nextbeast'] = $data[0]['timestamp'] + (60*60*3);	// 3 hrs
			$rendervar['status'] = "dormant";
			$tl = $rendervar['nextbeast'] - $cur;
			//$rendervar['statustext'] = "Year Beast lies dormant";
		} else if($cur<$event) {
			$rendervar['beastcome'] = $data[0]['timestamp'];	// 3 hrs
			$rendervar['status'] = "coming";
			$tl = $rendervar['beastcome'] - $cur;
			//$rendervar['statustext'] = "Year Beast is coming";
			//$rendervar['beastid'] = $data[0]['id'];
			//$rendervar['beaststart'] = date("c",$data[0]['timestamp']);
			//$rendervar['beastend'] = date("c",$data[0]['timestamp']+$data[0]['duration']);
		} else {
			$rendervar['beastflee'] = $data[0]['timestamp'] + $data[0]['duration'];	// 3 hrs
			$rendervar['status'] = "active";
			$tl = $rendervar['beastflee'] - $cur;
			//$rendervar['statustext'] = "Year Beast is here";
			//$rendervar['beastid'] = $data[0]['id'];
			//$rendervar['beaststart'] = date("c",$data[0]['timestamp']);
			//$rendervar['beastend'] = date("c",$data[0]['timestamp']+$data[0]['duration']);
		}
		
		if($tl>3600) $rendervar['timeleft'] = str_pad(floor($tl/3600),2,'0',STR_PAD_LEFT) . ":" . str_pad(floor(($tl%3600)/60),2,'0',STR_PAD_LEFT) . ":" . str_pad(($tl%60),2,'0',STR_PAD_LEFT);
		else $rendervar['timeleft'] = str_pad(floor($tl/60),2,'0',STR_PAD_LEFT) . ":" . str_pad(($tl%60),2,'0',STR_PAD_LEFT);
	}

	$locale = $app['translator']->getLocale();
	$rendervar['locale'] = $locale;

	$rtls = array('fa');

	$returnhtml = "";

	$isrtl = in_array($locale, $rtls);
	$rendervar['rtl'] = $isrtl;

	$returnhtml = $app['twig']->render('index_t.twig', $rendervar);

	return new Response($returnhtml, 200, array(
        'Cache-Control' => 's-maxage=1',
    ));
});

$app->get('/plain.txt', function() use($app) {
	
	$datastr = $app['predis']->get('beastdatashort');
	$data = unserialize($datastr);
	
	$rendervar = array();
	$rendervar['beast'] = $data;

	// current beast check
	$rendervar['status'] = "dormant";
	//$rendervar['statustext'] = "Year Beast lies dormant";
	if($data[0]) {
		$cur = time();
		$rendervar['servertime'] = $cur;
		$event = $data[0]['timestamp'];
		$duration = $data[0]['duration'];
		if($cur>$event+$duration) {
			$rendervar['nextbeast'] = $data[0]['timestamp'] + (60*60*3);	// 3 hrs
			$rendervar['status'] = "dormant";
			$tl = $rendervar['nextbeast'] - $cur;
			//$rendervar['statustext'] = "Year Beast lies dormant";
		} else if($cur<$event) {
			$rendervar['beastcome'] = $data[0]['timestamp'];	// 3 hrs
			$rendervar['status'] = "coming";
			$tl = $rendervar['beastcome'] - $cur;
			//$rendervar['statustext'] = "Year Beast is coming";
		} else {
			$rendervar['beastflee'] = $data[0]['timestamp'] + $data[0]['duration'];	// 3 hrs
			$rendervar['status'] = "active";
			$tl = $rendervar['beastflee'] - $cur;
			//$rendervar['statustext'] = "Year Beast is here";
		}
		
		if($tl>3600) $rendervar['timeleft'] = str_pad(floor($tl/3600),2,'0',STR_PAD_LEFT) . ":" . str_pad(floor(($tl%3600)/60),2,'0',STR_PAD_LEFT) . ":" . str_pad(($tl%60),2,'0',STR_PAD_LEFT);
		else $rendervar['timeleft'] = str_pad(floor($tl/60),2,'0',STR_PAD_LEFT) . ":" . str_pad(($tl%60),2,'0',STR_PAD_LEFT);
	}

	$returnhtml = $app['twig']->render('plaintext_t.twig', $rendervar);

	return new Response($returnhtml, 200, array(
		'Content-Type' => 'text/plain',
        'Cache-Control' => 's-maxage=1',
    ));

	// text/plain
});

$app->get('/history.json', function() use($app) {
	
	$datastr = $app['predis']->get('beastdata');
	$data = unserialize($datastr);

	return $app->json($data, 200, array(
		'Content-Type' => 'application/json',
        'Cache-Control' => 's-maxage=1',
        'Access-Control-Allow-Origin' => '*'
    ));

    // application/json

});

$app->get('/feed.rss', function() use($app) {
	
	$timezone = $app['request']->get('timezone');
	$rawtimezone = $timezone;

	if (in_array($timezone, DateTimeZone::listIdentifiers())) {
	    //echo "valid";
	}
	else {
	    //echo "invalid";
		$timezone = "America/Chicago";
	}

	$datastr = $app['predis']->get('beastdatashort');
	$data = unserialize($datastr);

	// datetizing it
	foreach ($data as $key => $value) {
		$data[$key]['timestampobj'] = new DateTime();
		$data[$key]['timestampobj']->setTimeStamp($value['timestamp']);
		$data[$key]['pubdateobj'] = new DateTime();
		$data[$key]['pubdateobj']->setTimeStamp($value['timestamp']-(60*60*2));
	}

	$rendervar = array();
	$rendervar['beast'] = $data;
	$rendervar['timezone'] = $timezone;

	if(!$rawtimezone) {
		$rendervar['querystring'] = "";
	} else {
		$rendervar['querystring'] = "?timezone=".$timezone;
	}

	$returnhtml = $app['twig']->render('rss.twig', $rendervar);

	return new Response($returnhtml, 200, array(
		'Content-Type' => 'application/rss+xml',
        'Cache-Control' => 's-maxage=1',
    ));

	// application/rss+xml
});

$app->get('/sitemap.xml', function() use($app) {
	
	$rendervar = array();
	$rendervar['lastmod'] = date("c");

	$returnhtml = $app['twig']->render('sitemap.twig', $rendervar);

	return new Response($returnhtml, 200, array(
		'Content-Type' => 'application/xml',
        'Cache-Control' => 's-maxage=1',
    ));

	// application/xml

});

$app->get('/secretupdate_duration/{timestamp}', function($timestamp) use($app) {

	$data = $app['db']->fetchAssoc('SELECT * FROM beast ORDER BY timestamp DESC LIMIT 1');

	$bid = $data['id'];
	$newduration = $timestamp - $data['timestamp'];

	$app['db']->update('beast', array('duration' => $newduration), array('id' => $bid));

	//$app['predis']->expire("beastdata", 0);
	//$app['predis']->expire("beastdatashort", 0);

	$subRequest = Request::create('/secretupdate_updatedb', 'GET');
    return $app->handle($subRequest, HttpKernelInterface::SUB_REQUEST);

	//return "OK";
});

$app->get('/secretupdate_start/{timestamp}', function($timestamp) use($app) {

	$app['db']->insert('beast', array('timestamp' => $timestamp,'duration'=>1200,'comment'=>''));

	//$app['predis']->expire("beastdata", 0);
	//$app['predis']->expire("beastdatashort", 0);

	$subRequest = Request::create('/secretupdate_updatedb', 'GET');
    return $app->handle($subRequest, HttpKernelInterface::SUB_REQUEST);
});

$app->get('/secretupdate_updatedb', function() use($app) {

	$data = $app['db']->fetchAll('SELECT * FROM beast ORDER BY timestamp DESC');
	$datastr = serialize($data);
	$app['predis']->set('beastdata',$datastr);
	$app['predis']->persist("beastdata");

	$data = $app['db']->fetchAll('SELECT * FROM beast ORDER BY timestamp DESC LIMIT 5');
	$datastr = serialize($data);
	$app['predis']->set('beastdatashort',$datastr);
	$app['predis']->persist("beastdatashort");

	$lastbeastid = $app['predis']->get('lastbeastid');
	if(!$lastbeastid || $lastbeastid!=$data[0]['id'] || $app['request']->get('reload')) {
		$lastbeastid = $app['predis']->set('lastbeastid',$data[0]['id']);
		$app['predis']->persist("lastbeastid");
		$lionbotresp = file_get_contents("http://yearbeast.bot.ip:7083/");
		return "OK-NEWBEAST-PING-" . $lionbotresp;
	}

	return "OK";
});

$app->run();

?>
