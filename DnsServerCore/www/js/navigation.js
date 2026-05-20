/*
Technitium DNS Server
Copyright (C) 2026  Shreyas Zare (shreyas@technitium.com)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/

(function () {
    "use strict";

    // Routes are stored in the URL as "#!/<mainTab>[/<subTab>]" so they don't
    // collide with the real element ids used as Bootstrap tab targets.
    var ROUTE_PREFIX = "#!/";

    var MAIN_CONTROLS_PREFIX = "mainPanelTabPane";

    // Main tabs that contain a sub-tab bar, mapped to the aria-controls prefix
    // used by that bar's sub-tab anchors.
    var SUB_GROUPS = {
        settings: "settingsTabPane",
        dhcp: "dhcpTabPane",
        admin: "adminTabPane",
        logs: "logsTabPane"
    };

    var routerInitialized = false;
    var isRestoring = false;

    // A tab is navigable unless it has been explicitly hidden (e.g. by .hide()
    // for permissions / cluster view). Layout-based :visible is avoided so the
    // check is reliable even before the parent pane has been laid out.
    function isShown(el) {
        return el.length > 0 && el.css("display") !== "none";
    }

    function slugFromControls(controls) {
        if (!controls)
            return "";

        var idx = controls.indexOf("TabPane");
        if (idx < 0)
            return controls.toLowerCase();

        return controls.substr(idx + "TabPane".length).toLowerCase();
    }

    function mainAnchors() {
        return $('a[data-toggle="tab"][aria-controls^="' + MAIN_CONTROLS_PREFIX + '"]');
    }

    function subAnchors(mainSlug) {
        var prefix = SUB_GROUPS[mainSlug];
        if (!prefix)
            return $();

        return $('a[data-toggle="tab"][aria-controls^="' + prefix + '"]');
    }

    function isRoutedAnchor(el) {
        var controls = $(el).attr("aria-controls");
        if (!controls)
            return false;

        if (controls.indexOf(MAIN_CONTROLS_PREFIX) === 0)
            return true;

        for (var slug in SUB_GROUPS) {
            if (controls.indexOf(SUB_GROUPS[slug]) === 0)
                return true;
        }

        return false;
    }

    function getActiveMainSlug() {
        var active = mainAnchors().filter(function () {
            return $(this).parent("li").hasClass("active");
        }).first();

        return slugFromControls(active.attr("aria-controls"));
    }

    function getActiveSubSlug(mainSlug) {
        if (!SUB_GROUPS[mainSlug])
            return "";

        var active = subAnchors(mainSlug).filter(function () {
            return $(this).parent("li").hasClass("active");
        }).first();

        return slugFromControls(active.attr("aria-controls"));
    }

    function getCurrentRoute() {
        var mainSlug = getActiveMainSlug();
        if (!mainSlug)
            return "";

        var route = mainSlug;
        var subSlug = getActiveSubSlug(mainSlug);
        if (subSlug)
            route += "/" + subSlug;

        return route;
    }

    function getDefaultRoute() {
        var visible = mainAnchors().filter(function () {
            return isShown($(this).parent("li"));
        }).first();

        return slugFromControls(visible.attr("aria-controls"));
    }

    function routeToHash(route) {
        return route ? ROUTE_PREFIX + route : "";
    }

    function hashToRoute(hash) {
        if (!hash || hash.indexOf(ROUTE_PREFIX) !== 0)
            return "";

        return hash.substr(ROUTE_PREFIX.length);
    }

    function recordRoute() {
        var route = getCurrentRoute();
        if (!route)
            return;

        var newHash = routeToHash(route);
        if (window.location.hash === newHash)
            return;

        window.history.pushState({ route: route }, "", newHash);
    }

    // Navigate the UI to match a route by simulating clicks on the relevant tab
    // anchors. A real click is used (instead of Bootstrap's tab('show')) so the
    // inline onclick refresh handlers run exactly as they do for the user.
    function applyRoute(route) {
        if (!route)
            return false;

        var parts = route.split("/");
        var mainSlug = parts[0];
        var subSlug = parts[1];

        var mainAnchor = mainAnchors().filter(function () {
            return slugFromControls($(this).attr("aria-controls")) === mainSlug;
        }).first();

        if (!isShown(mainAnchor.parent("li")))
            return false;

        isRestoring = true;
        try {
            if (!mainAnchor.parent("li").hasClass("active"))
                mainAnchor[0].click();

            if (subSlug && SUB_GROUPS[mainSlug]) {
                var subAnchor = subAnchors(mainSlug).filter(function () {
                    return slugFromControls($(this).attr("aria-controls")) === subSlug;
                }).first();

                if (isShown(subAnchor.parent("li")) && !subAnchor.parent("li").hasClass("active"))
                    subAnchor[0].click();
            }
        } finally {
            isRestoring = false;
        }

        return true;
    }

    function onPopState() {
        var route = hashToRoute(window.location.hash);
        if (!route)
            route = getDefaultRoute();

        if (route)
            applyRoute(route);
    }

    function onTabShown(e) {
        if (isRestoring)
            return;

        if (!isRoutedAnchor(e.target))
            return;

        recordRoute();
    }

    function initNavigationRouter() {
        if (routerInitialized)
            return;

        routerInitialized = true;

        $(document).on("shown.bs.tab", 'a[data-toggle="tab"]', onTabShown);
        $(window).on("popstate", onPopState);
    }

    // Called from showPageMain() once the default tab state is established and
    // the main page is visible. Restores any bookmarked route, then syncs the
    // current history entry's URL to the actual tab state.
    window.navOnPageMain = function () {
        initNavigationRouter();

        var route = hashToRoute(window.location.hash);
        if (route)
            applyRoute(route);

        var current = getCurrentRoute();
        window.history.replaceState({ route: current }, "", routeToHash(current));
    };
})();
