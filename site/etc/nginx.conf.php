http {
    include       mime.types;
    default_type  application/octet-stream;

    #log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
    #                  '$status $body_bytes_sent "$http_referer" '
    #                  '"$http_user_agent" "$http_x_forwarded_for"';

    #access_log  logs/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    #keepalive_timeout  0;
    keepalive_timeout  65;

    #gzip  on;

    fastcgi_buffers 256 4k;

    # define an easy to reference name that can be used in fastgi_pass
    upstream heroku-fcgi {
        #server 127.0.0.1:4999 max_fails=3 fail_timeout=3s;
        server unix:/tmp/heroku.fcgi.<?=getenv('PORT')?:'8080'?>.sock max_fails=3 fail_timeout=3s;
        keepalive 16;
    }

    fastcgi_cache_path /tmp/cache levels=1:2 keys_zone=yearbeast:10m inactive=1m;
    fastcgi_cache_key "$scheme$request_method$host$request_uri";
    
    server {
        # define an easy to reference name that can be used in try_files
        location @heroku-fcgi {

            fastcgi_cache yearbeast;
            fastcgi_cache_valid 200 1s; # Only cache 200 responses, cache for 60 minutes
            fastcgi_cache_methods GET HEAD; # Only GET and HEAD methods apply
            add_header X-Fastcgi-Cache $upstream_cache_status;
            #fastcgi_cache_bypass $no_cache;  # Don't pull from cache based on $no_cache
            #fastcgi_no_cache $no_cache; # Don't save to cache based on $no_cache

            include fastcgi_params;
            
            fastcgi_split_path_info ^(.+\.php)(/.*)$;
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
            # try_files resets $fastcgi_path_info, see http://trac.nginx.org/nginx/ticket/321, so we use the if instead
            fastcgi_param PATH_INFO $fastcgi_path_info if_not_empty;
            
            if (!-f $document_root$fastcgi_script_name) {
                # check if the script exists
                # otherwise, /foo.jpg/bar.php would get passed to FPM, which wouldn't run it as it's not in the list of allowed extensions, but this check is a good idea anyway, just in case
                return 404;
            }
            
            fastcgi_pass heroku-fcgi;
        }
        
        # TODO: use X-Forwarded-Host? http://comments.gmane.org/gmane.comp.web.nginx.english/2170
        server_name localhost;
        listen <?=getenv('PORT')?:'8080'?>;
        # FIXME: breaks redirects with foreman
        port_in_redirect off;
        
        root "<?=getenv('DOCUMENT_ROOT')?:getenv('HEROKU_APP_DIR')?:getcwd()?>";
        
        error_log stderr;
        access_log /tmp/heroku.nginx_access.<?=getenv('PORT')?:'8080'?>.log;
        
        #include "<?=getenv('HEROKU_PHP_NGINX_CONFIG_INCLUDE')?>";

        location / {
            #index  index.php index.html index.htm;
            try_files $uri @rewriteapp;
        }

        location ~ ^/(composer\.|Procfile$|<?=getenv('COMPOSER_VENDOR_DIR')?>/|<?=getenv('COMPOSER_BIN_DIR')?>/) {
            deny all;
        }
        
        # restrict access to hidden files, just in case
        location ~ /\. {
            deny all;
        }

         # nginx configuration
        location @rewriteapp {
            #if (!-e $request_filename){
            #    rewrite ^(.*)$ /index.php break;
            #}
            rewrite ^(.*)$ /index.php last;
        }
        
        # default handling of .php
        location ~ \.php {
            try_files @heroku-fcgi @heroku-fcgi;
            internal;
        }
       
    }

    gzip on;
    gzip_disable "msie6";

    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_types text/plain text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript;
}