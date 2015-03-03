
var timezone = "GMT";
var cltimestamp = Math.floor(Date.now() / 1000);
var svtime = 0;

var dateformat = "MMM D, YYYY HH:mm";

function calculateTime() {

    $('.timedata').each(function() {
        $(this).text(moment.unix($(this).attr('attr-timestamp')).tz(timezone).format(dateformat));
        //$(this).text(moment.unix($(this).attr('attr-timestamp')).format(dateformat));
    });

    $('.timedata.sighting').popover({
        title: function() {
            return moment.unix($(this).attr('attr-timestamp')).tz(timezone).format(dateformat);
            //return moment.unix($(this).attr('attr-timestamp')).format(dateformat);
        },
        content: function() {
            return "<b>"+txt_duration+"</b> " + $(this).attr('attr-duration') + " "+txt_seconds+"<br /><b>"+txt_note+"</b> " + $(this).attr('attr-comment');
        },
        placement: "bottom",
        trigger: "hover",
        html: true
    });

}

function updateClock() {
    svclock++;
    $("#svtime").text(moment.unix(svclock).format("HH:mm:ss"));
    $("#cltime").text(moment().tz(timezone).format("HH:mm:ss"));
}

function changeTimezone(ntz) {
    timezone = ntz;
    $('#timezonename').text(timezone);
    calculateTime();
}

$(function() {

    timezone = jstz.determine().name();
    $('#timezonename').text(timezone);

    // determining out-of-sync clock
    console.log("Client timestamp : " + cltimestamp);
    console.log("Server timestamp : " + svtimestamp);
    console.log("Diffirentiation : " + Math.abs(cltimestamp-svtimestamp));

    svclock = svtimestamp;
    updateClock();
    setInterval(updateClock,1000);

    calculateTime();

    if($('.countdown').length) {

        var targettimestamp = $('.countdown').attr('attr-expire') - svtimestamp;
        if(targettimestamp<=0) {

            $("#nextappeardesc").html(txt_late);

        } else {
            var targettime = new Date((cltimestamp + targettimestamp)*1000);

            $('.countdown').countdown(targettime).on('update.countdown',function(event) {
                if(event.offset.hours>0) $(this).text(event.strftime('%H:%M:%S'));
                else $(this).text(event.strftime('%M:%S'));

                if($(this).attr('attr-ontitle')) {
                    if($(this).attr('attr-ontitle-alt') && event.offset.seconds % 2 == 1) {
                        document.title = $(this).attr('attr-ontitle-alt') + $(this).text() + " - " + pagetitle;
                    } else {
                        document.title = $(this).attr('attr-ontitle') + $(this).text() + " - " + pagetitle;
                    }
                }
            }).on('finish.countdown',function(event) {
                // refresh page
                $(this).text(event.strftime('00:00'));
                //if($(this).attr('attr-noreload')!="true") 
                // delayed reload to distribute load
                var delay = Math.floor(Math.random() * $(this).attr('attr-maxreloaddelay'));
                setTimeout(function(){ location.reload(); }, delay);
            });
        }

    }


});