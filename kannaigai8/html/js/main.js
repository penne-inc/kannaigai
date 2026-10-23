/*
    Name: Lumberjacket
    Description: Responsive Coming Soon 
    Version: 1.0
    Author: MountainTheme

    TABLE OF CONTENTS
    ---------------------------
     1. Loading
     2. Backstretch Image Background
         2.1 Backstretch Slideshow Background
     3. jQuery Tweetie
     4. Countdown
     5. Contact form
     6. Ajax mailchimp
     7. Video Background
     8. Google Map
*/

        /* ================================= */
        /* :::::::::: 1. Loading ::::::::::: */
        /* ================================= */

        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            $('#video').css({
                'opacity': '0.0'
            });
        }

       
        $(window).load(function() {

            $(".loader-icon").delay(500).fadeOut();
            $("#page-loader").delay(700).fadeOut("slow");

        });

        /* ================================= */
        /* ::::::::: 2. Backstretch :::::::: */
        /* ================================= */

        /* Active Single Image Background  */

       /* $('body').backstretch('images/slider/background2.jpg'); */

        // ==== SLIDESHOW BACKGROUND ====
        // Set URLs to background images inside the array
        // Each image must be on its own line, inbetween speech marks (" ") and with a comma at the end of the line
        // Add / remove images by changing the number of lines below
        // Variable fade = transition speed for fade animation, in milliseconds
        // Variable duration = time each slide is shown for, in milliseconds


        /* ↓ Remove comments if you want to use the slideshow  ↓  */

        $('body').backstretch([
             'html/imgs/bg/background1.jpg', 
             'html/imgs/bg/background2.jpg', 
             'html/imgs/bg/background3.jpg', 
             'html/imgs/bg/background4.jpg'
         ],{duration: 3000, fade: 750}); 




        /* ================================= */
        /* :::::::::: 4. Countdown ::::::::: */
        /* ================================= */



        var countdown = $('.DateCountdown');

        createTimeCicles();

        $(window).on('resize', windowSize);

        function windowSize() {
            countdown.TimeCircles().destroy();
            createTimeCicles();
            countdown.on('webkitAnimationEnd mozAnimationEnd oAnimationEnd animationEnd', function() {
                countdown.removeClass('animated fadeIn');
            });

        }

        // TimeCicles - Create and Options
        function createTimeCicles() {
            countdown.addClass('animated fadeIn');
            countdown.TimeCircles({
                animation: 'smooth',
                bg_width: 0.4,
                fg_width: 0.04,

                circle_bg_color: 'rgba(0,0,0,0.8)',
                time: {
                    Days: {
                        color: '#d02327'
                    },
                    Hours: {
                        color: '#d02327'
                    },
                    Minutes: {
                        color: '#d02327'
                    },
                    Seconds: {
                        color: '#d02327'
                    },
                    Seconds: {
                        color: '#d02327'
                    }
                }
            });
            countdown.on('webkitAnimationEnd mozAnimationEnd oAnimationEnd animationEnd', function() {
                countdown.removeClass('animated fadeIn');
            });
        }



        /* ================================= */
        /* :::::::: 5. Contact form :::::::: */
        /* ================================= */

        $(function() {
            $('#submit').on('click', function() {
                // validate and process form here 
                $('#ajax-contact-form').validate({

                    rules: {

                        name: {
                            required: true,
                        },

                        email: {
                            required: true,
                            email: true,
                        },

                        msg: {
                            required: true,
                        },
                    },

                    messages: {

                        name: {
                            required: '<i class="fa fa-exclamation-triangle name"></i>',
                        },

                        email: {
                            required: '<i class="fa fa-exclamation-triangle email"></i>',
                            email: '<i class="fa fa-exclamation-triangle email"></i>',
                        },

                        msg: {
                            required: '<i class="fa fa-exclamation-triangle message"></i>',
                        },

                    },

                    // JQuery's awesome submit handler.
                    submitHandler: function(form) {

                        // Create variables from the form
                        var name = $('input#name').val();
                        var email = $('input#email').val();
                        var msg = $('textarea#msg').val();

                        // Create variables that will be sent in a URL string to contact.php
                        var dataString = '&name=' + name + '&email=' + email + '&msg=' + msg;

                        $.ajax({
                            type: 'POST',
                            url: 'php/contact.php',
                            data: dataString,
                            success: function(data) {
                                if (data == 'OK') {
                                    var result = '<div class="notification_ok"><i class="fa fa-check"></i> Your email was sent. Thanks!</div>';
                                    $('#ajax-contact-form').find('input[type=text], input[type=email], textarea').val('');

                                } else {
                                    result = data;
                                }
                                $('#note').html(result);

                            }

                        });
                        return false;
                    }
                });
            });
        });





        /* ================================= */
        /* :::::: 7. Video Background :::::: */
        /* ================================= */

        var video = $('#video').data('video');
        var mute = $('#video').data('mute');

        $('#video').YTPlayer({
            videoId: video,
            mute: mute,
            fitToBackground: true,
        });


