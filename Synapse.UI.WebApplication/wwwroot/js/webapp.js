var SYNAPSEUI = SYNAPSEUI || {};

SYNAPSEUI.webApp = (function () {
    var init = function () {
        // position popup menu below hamburger
        var ele = $(".s-nav-menu");
        var dropdownmenu = $(".s-nav-menu-inner");
        dropdownmenu.css('right', "0px");
        dropdownmenu.css('top', ele.offset().top + ele.outerHeight(true) + 5);

        // handle showing and hiding of popup menu
        // https://css-tricks.com/dangers-stopping-event-propagation/
        $(".s-js-nav-hamburger").click(function (e) {
            var dropdownmenu = $(".s-nav-menu-inner");
            if (dropdownmenu.is(':visible')) {
                dropdownmenu.hide();
            }
            else {
                dropdownmenu.show();
            }
            return false;
        });

        $(document).on('click', function (e) {
            if (!$(e.target).closest(".s-nav-menu-inner").length && !$(e.target).closest(".s-js-nav-hamburger").length) {
                $(".s-nav-menu-inner").hide();
            }
        });
    }

    var closeMenuOnClickOutside = function (e) {
        var menu = $(".s-menu");
        if (menu.is(':visible') && !menu.is(e.target) && !menu.has(e.target).length) {
            menu.hide();
            document.body.removeEventListener('click', closeMenuOnClickOutside, false);
        }
    }

    return {
        init: init
    };

})();
$(function () { SYNAPSEUI.webApp.init(); });
    