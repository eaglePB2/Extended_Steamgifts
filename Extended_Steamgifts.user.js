// ==UserScript==
// @name         Extended Steamgifts (Complete Refactored)
// @description  Streamlined, high-performance features for Steamgifts.com
// @author       Nandee, Modified by EaglePB2, Refactored by Linus Style Skill.md ruleset
// @namespace    esg
// @include      *steamgifts.com*
// @version      3.2.0
// @grant        none
// @license      MIT
// ==/UserScript==

(function ($) {
    'use strict';

    /* =========================================================================
     * 1. 核心儲存與宣告式配置定義 (Storage & Options Schema)
     * ========================================================================= */
    const Storage = {
        get(key, def) {
            const val = localStorage.getItem(key);
            return val !== null ? val : def;
        },
        getNumber(key, def) {
            const val = Number(this.get(key, def));
            return Number.isNaN(val) ? def : val;
        },
        set(key, val) {
            localStorage.setItem(key, val);
        }
    };

    // 配置項定義 (資料驅動視圖，零冗餘)
    const OPTIONS_SCHEMA = [
        { key: 'esg_autoscroll', label: 'Endless scrolling', def: 1 },
        { key: 'esg_chances', label: 'Display chances', def: 1 },
        { key: 'esg_fixedheader', label: 'Fixed header', def: 1 },
        { key: 'esg_refresh', label: 'Refresh points (60sec)', def: 0 },
        { key: 'esg_scrolltop', label: 'Scroll to top button', def: 1 },
        { key: 'esg_hideentered', label: 'Hide entered giveaways', def: 0 },
        { key: 'esg_discussions', label: 'Active discussions in sidebar', def: 1 },
        { key: 'esg_gsg', label: 'Giveaway Signature Generator', def: 1 },
        { key: 'esg_gamark', label: 'Giveaway marks ([NEW], [FREE])', def: 1 },
        { key: 'esg_hidefeatured', label: 'Hide featured giveaway', def: 0 },
        { key: 'esg_commenteditor', label: 'Comment editor toolbar', def: 1 },
        { key: 'esg_comment', label: 'Comment features (media embeds & auto images)', def: 1 }
    ];

    const PATH = window.location.pathname;
    const LOGGED_IN = $('.nav__sits').length === 0;
    const SCRIPT_VER = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : '3.2.0';
    const XSRF_TOKEN = $('input[type=hidden][name=xsrf_token]').val();

    /* =========================================================================
     * 2. CSS 靜態樣式注入
     * ========================================================================= */
    const STYLES = `
        .sidebar__entry-custom { display: inline-block; margin: 0 -10px !important; padding: 0 8px !important; min-width: 50px; font-family: 'Arial', sans-serif; font-size: 11px; line-height: 26px; }
        .sidebar__navigation__itemz:hover .sidebar__navigation__item__underline { border-bottom: 2px solid transparent !important; }
        .sidebar__navigation__item__title { font-weight: bold; font-size: 15px; }
        .sidebar__navigation__itemz { font-size: 13px; }
        .filter_table { width: 100%; }
        .filter_table td { padding: 2px; vertical-align: middle; }
        .scroll-top { cursor: pointer; position: fixed; bottom: 10px; right: 40px; transform: rotate(-90deg); opacity: 0.75; z-index: 50; padding: 10px !important; display: none; }
        .page-loading { width: 160px; height: 24px; margin: 5px auto; display: none; }
        .floating-pagination { position: fixed; bottom: 45px; width: ${$(".sidebar").width() || 250}px; text-align: center; z-index: 99999; }
        .filter-content { margin-top: 10px; padding: 5px; }
        .filter__slider { width: 80%; }
        .sidebar__navigation__itemz, .sidebar__navigation__item__link, .sidebar__navigation__item__underline { max-width: 9999px !important; }

        /* 評論編輯器專用樣式 */
        .esg__tools-wrap { display: block; margin: 5px 0; padding: 3px 6px; background: #2f3540; border-radius: 3px; border: 1px solid #434c5a; }
        .esg__tool-btn { display: inline-block !important; padding: 3px 7px !important; margin: 1px !important; background: #3c424d; color: #cdd4dc !important; border-radius: 2px; cursor: pointer; font-size: 11px; line-height: 16px; text-align: center; border: 1px solid transparent; }
        .esg__tool-btn:hover { background: #587cd7; color: #fff !important; border-color: #7b9bf0; }
        .esg__tool-sep { display: inline-block; width: 1px; height: 14px; background: #4b5463; margin: 0 4px; vertical-align: middle; }
    `;
    $('<style>').text(STYLES).appendTo('head');

    /* =========================================================================
     * 3. 抽獎資料解析與過濾核心 (Data Structures First)
     * ========================================================================= */
    function parseGiveaway($el) {
        const cached = $el.data('esg_data');
        if (cached) return cached;

        const headingWrap = $el.find('.giveaway__heading__thin');
        const headingText = headingWrap.text();
        const copiesMatch = headingText.match(/\(([0-9,]+) Copies\)/);
        const copies = copiesMatch ? parseInt(copiesMatch[1].replace(/,/g, ''), 10) : 1;

        const entriesText = $el.find('.giveaway__links span:first').text().replace(/,/g, '');
        const entriesMatch = entriesText.match(/\d+/);
        const entries = entriesMatch ? parseInt(entriesMatch[0], 10) : 0;

        const entered = $el.find('.giveaway__row-inner-wrap').hasClass('is-faded');
        const costMatch = headingWrap.last().text().match(/([0-9]+)P/);
        const cost = costMatch ? parseInt(costMatch[1], 10) : 0;

        const levelText = $el.find(".giveaway__column--contributor-level").text();
        const levelMatch = levelText.match(/Level\s*([0-9]+)/);
        const level = levelMatch ? parseInt(levelMatch[1], 10) : 0;

        const totalEntries = entries + (entered ? 0 : 1);
        const chance = totalEntries <= 0 ? 100 : Math.min(100, Math.round((copies / totalEntries) * 10000) / 100);

        const data = {
            el: $el,
            copies,
            entries,
            cost,
            level,
            chance,
            entered,
            isPinned: $el.closest('.pinned-giveaways__outer-wrap').length > 0,
            hasGroup: $el.find('.giveaway__column--group').length > 0,
            hasWhitelist: $el.find('.giveaway__column--whitelist').length > 0,
            hasRegion: $el.find('.giveaway__column--region-restricted').length > 0,
            hasCommunity: $el.find('.giveaway__column--community-voted').length > 0
        };

        $el.data('esg_data', data);
        return data;
    }

    function checkFilterTriState(mode, hasFlag) {
        if (mode === 0 && hasFlag) return false;
        if (mode === 2 && !hasFlag) return false;
        return true;
    }

    function applyFilters() {
        if (PATH !== '/') return;

        const minLevel = Storage.getNumber("esg_f_min_level", 0);
        const maxLevel = Storage.getNumber("esg_f_max_level", 10);
        const minChance = Storage.getNumber("esg_f_min_chance", 0);
        const maxChance = Storage.getNumber("esg_f_max_chance", 100);
        const minPoints = Storage.getNumber("esg_f_min_points", 0);
        const maxPoints = Storage.getNumber("esg_f_max_points", 50);
        const minCopies = Storage.getNumber("esg_f_min_copies", 1);
        const maxCopies = Storage.getNumber("esg_f_max_copies", 100000);

        const groupMode = Storage.getNumber("esg_f_group", 1);
        const whiteMode = Storage.getNumber("esg_f_whitelist", 1);
        const regionMode = Storage.getNumber("esg_f_regionrestricted", 1);
        const commMode = Storage.getNumber("esg_f_community", 1);

        $('.giveaway__row-outer-wrap').each(function () {
            const data = parseGiveaway($(this));
            if (data.isPinned) return;

            const visible =
                data.level >= minLevel && data.level <= maxLevel &&
                data.chance >= minChance && data.chance <= maxChance &&
                data.cost >= minPoints && data.cost <= maxPoints &&
                (data.copies >= minCopies && (maxCopies === 100000 || data.copies <= maxCopies)) &&
                checkFilterTriState(groupMode, data.hasGroup) &&
                checkFilterTriState(whiteMode, data.hasWhitelist) &&
                checkFilterTriState(regionMode, data.hasRegion) &&
                checkFilterTriState(commMode, data.hasCommunity);

            data.el.toggle(visible);
        });
    }

    function decorateGiveaway($el) {
        const data = parseGiveaway($el);

        if (Storage.getNumber("esg_chances", 1) && LOGGED_IN) {
            if ($el.find('.esg-chance-tag').length === 0) {
                const odds = (data.entries / (data.copies || 1)).toFixed(0);
                const style = data.chance >= 5 ? 'style="font-weight:bold"' : '';
                $el.find('.giveaway__columns div:first').after(
                    `<div class="esg-chance-tag"><i class="fa fa-fw fa-area-chart"></i> <span title="Odds: ${odds}:1" ${style}>${data.chance.toFixed(2)}% chance</span></div>`
                );
            }
        }

        if (Storage.getNumber("esg_gamark", 1) && $el.find('.ga-mark').length === 0) {
            const heading = $el.find(".giveaway__heading__name");
            const timeFill = $el.find(".giveaway__column--width-fill span").text();
            const isNew = timeFill.includes('minute') || timeFill.includes('second');
            if (isNew) {
                heading.prepend('<font color="#BFBF00" class="ga-mark">[NEW]</font> ');
            }
            if (data.cost === 0 && heading.text().trim() !== 'Invite Only') {
                heading.prepend('<font color="#00BFBF" class="ga-mark">[FREE]</font> ');
            }
        }

        // 依據設定隱藏已參加抽獎
        if (Storage.getNumber("esg_hideentered", 0) && data.entered && !data.isPinned && !PATH.includes('/won') && !PATH.startsWith('/user')) {
            $el.addClass("is-hidden");
        }
    }

    /* =========================================================================
     * 4. 導航欄擴充 (Bundle Games & ESG Tab)
     * ========================================================================= */
    function initNavigationTabs() {
        const $helpDropdown = $(".nav__button:contains('Help')")
            .closest(".nav__button-container")
            .find(".nav__absolute-dropdown");

        if ($helpDropdown.length && $helpDropdown.find('a[href="/bundle-games"]').length === 0) {
            $helpDropdown.append(`
                <a class="nav__row" href="/bundle-games">
                    <i class="icon-red fa fa-fw fa-delicious"></i>
                    <div class="nav__row__summary">
                        <p class="nav__row__summary__name">Bundle games</p>
                        <p class="nav__row__summary__description">Full list of bundle games.</p>
                    </div>
                </a>
            `);
        }

        const $navLeft = $("header .nav__left-container");
        if ($navLeft.length && $navLeft.find('.esg__nav-container').length === 0) {
            $navLeft.prepend(
                `<img src="https://raw.githubusercontent.com/nandee95/Extended_Steamgifts/master/img/logo_trans.png" height="32px" width="32px" title="Extended Steamgifts ${SCRIPT_VER}&#013;By: Nandee">`
            );

            $navLeft.append(`
                <div class="nav__button-container esg__nav-container">
                    <div class="nav__relative-dropdown is-hidden">
                        <div class="nav__absolute-dropdown">
                            <a class="nav__row" target="_blank" href="http://steamcommunity.com/groups/extendedsg">
                                <i class="icon-grey fa fa-fw fa-steam"></i>
                                <div class="nav__row__summary">
                                    <p class="nav__row__summary__name">Steam Group</p>
                                    <p class="nav__row__summary__description">Open ESG steam group</p>
                                </div>
                            </a>
                            <a class="nav__row" href="/account/profile/sync#esg_options">
                                <i class="icon-grey fa fa-fw fa-cog"></i>
                                <div class="nav__row__summary">
                                    <p class="nav__row__summary__name">Options</p>
                                    <p class="nav__row__summary__description">Open options</p>
                                </div>
                            </a>
                            <a class="nav__row" target="_blank" href="http://steamcommunity.com/groups/extendedsg/discussions/0/">
                                <i class="icon-red fa fa-fw fa-bug"></i>
                                <div class="nav__row__summary">
                                    <p class="nav__row__summary__name">Bug report</p>
                                    <p class="nav__row__summary__description">Report bugs here!</p>
                                </div>
                            </a>
                            <a class="nav__row" target="_blank" href="https://github.com/nandee95/Extended_Steamgifts">
                                <i class="icon-green fa fa-fw fa-github"></i>
                                <div class="nav__row__summary">
                                    <p class="nav__row__summary__name">Source Code</p>
                                    <p class="nav__row__summary__description">GitHub</p>
                                </div>
                            </a>
                            <a class="nav__row" href="/account/profile/sync#esg_about">
                                <i class="fa fa-fw fa-info-circle" style="color:lightblue"></i>
                                <div class="nav__row__summary">
                                    <p class="nav__row__summary__name">About</p>
                                    <p class="nav__row__summary__description">Author / Contact / Donate</p>
                                </div>
                            </a>
                        </div>
                    </div>
                    <a class="nav__button nav__button--is-dropdown" href="/discussion/qbPEr/">ESG</a>
                    <div class="nav__button nav__button--is-dropdown-arrow"><i class="fa fa-angle-down"></i></div>
                </div>
            `);
        }

        $(document).off('click.esgNav').on('click.esgNav', 'nav .nav__button--is-dropdown-arrow', function (event) {
            const $this = $(this);
            const isSelected = $this.hasClass("is-selected");

            $("nav .nav__button").removeClass("is-selected");
            $("nav .nav__relative-dropdown").addClass("is-hidden");

            if (!isSelected) {
                $this.addClass("is-selected").siblings(".nav__relative-dropdown").removeClass("is-hidden");
                event.stopPropagation();
            }
        });
    }

    /* =========================================================================
     * 5. Options 與 About 管理頁面 (Declarative Options Page)
     * ========================================================================= */
    function renderOptionsView($container) {
        document.title = "Account - Extended Steamgifts - Options";
        $container.empty();

        $(".sidebar__navigation__item").removeClass("is-selected");
        $(".fa-caret-right:first").remove();
        $(".esg__options").addClass("is-selected").find(".sidebar__navigation__item__link").prepend('<i class="fa fa-caret-right"></i>');

        let rowsHtml = '';
        OPTIONS_SCHEMA.forEach((item, index) => {
            const currentVal = Storage.getNumber(item.key, item.def);
            rowsHtml += `
                <div class="form__row" data-key="${item.key}">
                    <div class="form__heading">
                        <div class="form__heading__number">${index + 1}.</div>
                        <div class="form__heading__text">${item.label}</div>
                    </div>
                    <div class="form__row__indent">
                        <div class="form__checkbox cb__opt-yes ${currentVal ? 'is-selected' : ''}">
                            <i class="form__checkbox__default fa fa-circle-o"></i>
                            <i class="form__checkbox__hover fa fa-circle"></i>
                            <i class="form__checkbox__selected fa fa-check-circle"></i> Enabled
                        </div>
                        <div class="form__checkbox cb__opt-no ${currentVal ? '' : 'is-selected'}">
                            <i class="form__checkbox__default fa fa-circle-o"></i>
                            <i class="form__checkbox__hover fa fa-circle"></i>
                            <i class="form__checkbox__selected fa fa-check-circle"></i> Disabled
                        </div>
                    </div>
                </div>
            `;
        });

        $container.html(`
            <div class="page__heading">
                <div class="page__heading__breadcrumbs">
                    <a>Extended Steamgifts</a>
                    <i class="fa fa-angle-right"></i>
                    <a href="/account/profile/sync#esg_options">Options</a>
                </div>
            </div>
            <form>
                <div class="form__rows">
                    ${rowsHtml}
                    <div class="form__submit-button js__save-esg-options"><i class="fa fa-arrow-circle-right"></i> Save Changes</div>
                </div>
            </form>
        `);

        // 切換開關互動
        $container.find('.cb__opt-yes').on('click', function () {
            $(this).addClass('is-selected').siblings('.cb__opt-no').removeClass('is-selected');
        });
        $container.find('.cb__opt-no').on('click', function () {
            $(this).addClass('is-selected').siblings('.cb__opt-yes').removeClass('is-selected');
        });

        // 批次儲存
        $container.find('.js__save-esg-options').on('click', function () {
            $container.find('.form__row[data-key]').each(function () {
                const key = $(this).data('key');
                const isEnabled = $(this).find('.cb__opt-yes').hasClass('is-selected') ? 1 : 0;
                Storage.set(key, isEnabled);
            });
            alert("Settings are saved successfully!");
        });
    }

    function renderAboutView($container) {
        document.title = "Account - Extended Steamgifts - About";
        $container.empty();

        $(".sidebar__navigation__item").removeClass("is-selected");
        $(".fa-caret-right:first").remove();
        $(".esg__about").addClass("is-selected").find(".sidebar__navigation__item__link").prepend('<i class="fa fa-caret-right"></i>');

        // 替换为你的真实 GitHub 仓库地址与用户名
        const FORK_REPO = "https://github.com/eaglePB2/Extended_Steamgifts";
        const UPSTREAM_REPO = "https://github.com/nandee95/Extended_Steamgifts";

        $container.html(`
            <div class="page__heading">
                <div class="page__heading__breadcrumbs">
                    <a href="https://www.steamgifts.com/discussion/qbPEr/">Extended Steamgifts</a>
                    <i class="fa fa-angle-right"></i>
                    <a href="/account/profile/sync#esg_about">About</a>
                </div>
            </div>
            <div class="form__rows">
                <div class="form__row">
                    <div class="form__heading">
                        <div class="form__heading__number">1.</div>
                        <div class="form__heading__text">Extended Steamgifts ${SCRIPT_VER}</div>
                    </div>
                    <div class="form__row__indent markdown">
                        <strong>Maintained by:</strong> EaglePB2<br>
                        <strong>Original Author:</strong> Nandee (2014-2016)<br>
                        <strong>License:</strong> <a href="${FORK_REPO}/blob/master/LICENSE.md" target="_blank">MIT License</a><br><br>
                        <strong>Source Code:</strong> <a href="${FORK_REPO}" target="_blank">${FORK_REPO.replace('https://', '')}</a><br>
                        <strong>Upstream:</strong> <a href="${UPSTREAM_REPO}" target="_blank">github.com/nandee95/Extended_Steamgifts</a>
                    </div>
                </div>
                <div class="form__row">
                    <div class="form__heading">
                        <div class="form__heading__number">2.</div>
                        <div class="form__heading__text">Project Status</div>
                    </div>
                    <div class="form__row__indent">
                        Maintained fork. Decoupled DOM parsing architecture, eliminated scroll death loops, and restored modern site compatibility.
                    </div>
                </div>
            </div>
        `);
    }

    function initAccountPages() {
        if (!PATH.startsWith('/account/')) return;

        // 在個人中心側邊欄插入選單項
        const $sidebarNav = $(".sidebar__navigation:last");
        if ($sidebarNav.length && $('.esg__options').length === 0) {
            $sidebarNav.after(`
                <h3 class="sidebar__heading">Extended Steamgifts</h3>
                <ul class="sidebar__navigation">
                    <li class="sidebar__navigation__item esg__options">
                        <a class="sidebar__navigation__item__link" href="/account/profile/sync#esg_options">
                            <div class="sidebar__navigation__item__name">Options</div>
                            <div class="sidebar__navigation__item__underline"></div>
                        </a>
                    </li>
                    <li class="sidebar__navigation__item esg__about">
                        <a class="sidebar__navigation__item__link" href="/account/profile/sync#esg_about">
                            <div class="sidebar__navigation__item__name">About</div>
                            <div class="sidebar__navigation__item__underline"></div>
                        </a>
                    </li>
                </ul>
            `);
        }

        function routeAccountHash() {
            const hash = window.location.hash;
            const $targetContainer = $(".widget-container").children("div:last");
            if (!$targetContainer.length) return;

            if (hash === '#esg_options') {
                renderOptionsView($targetContainer);
            } else if (hash === '#esg_about') {
                renderAboutView($targetContainer);
            }
        }

        $(window).on('hashchange', routeAccountHash);
        routeAccountHash();
    }

    /* =========================================================================
     * 6. 評論編輯器增強模組 (Robust Comment Toolbar)
     * ========================================================================= */
    function initCommentEditor() {
        if (!Storage.getNumber("esg_commenteditor", 1)) return;

        const FormatActions = {
            wrap(before, sel, after, token) {
                const content = sel || 'text';
                return {
                    text: `${before}${token}${content}${token}${after}`,
                    start: before.length + token.length,
                    end: before.length + token.length + content.length
                };
            },
            prefix(before, sel, after, token) {
                const target = sel || 'text';
                const prefixed = target.split('\n').map(line => `${token}${line}`).join('\n');
                return {
                    text: `${before}${prefixed}${after}`,
                    start: before.length,
                    end: before.length + prefixed.length
                };
            },
            insert(before, sel, after, token) {
                return {
                    text: `${before}${token}${after}`,
                    start: before.length + token.length,
                    end: before.length + token.length
                };
            },
            template(before, sel, after, type) {
                const url = prompt(type === 'url' ? "Link URL:" : "Image URL:", "https://");
                if (!url) return null;
                const label = prompt("Display Text:", sel || (type === 'url' ? "link" : "image")) || "";
                const token = type === 'url' ? `[${label}](${url})` : `![${label}](${url})`;
                return {
                    text: `${before}${token}${after}`,
                    start: before.length,
                    end: before.length + token.length
                };
            }
        };

        const BUTTON_DEFS = [
            { icon: 'fa-italic', title: 'Italic (*)', act: 'wrap', val: '*' },
            { icon: 'fa-bold', title: 'Bold (**)', act: 'wrap', val: '**' },
            { icon: 'fa-strikethrough', title: 'Strikethrough (~~)', act: 'wrap', val: '~~' },
            { icon: 'fa-stop', title: 'Spoiler (~)', act: 'wrap', val: '~' },
            { icon: 'fa-code', title: 'Code Block (```)', act: 'wrap', val: '```' },
            { sep: true },
            { icon: 'fa-list-ul', title: 'List (* )', act: 'prefix', val: '* ' },
            { icon: 'fa-quote-left', title: 'Blockquote (> )', act: 'prefix', val: '> ' },
            { text: 'H1', title: 'Heading 1 (# )', act: 'prefix', val: '# ' },
            { text: 'H2', title: 'Heading 2 (## )', act: 'prefix', val: '## ' },
            { text: 'H3', title: 'Heading 3 (### )', act: 'prefix', val: '### ' },
            { sep: true },
            { icon: 'fa-minus', title: 'Horizontal Line', act: 'insert', val: '\n---\n' },
            { icon: 'fa-globe', title: 'Insert URL', act: 'template', val: 'url' },
            { icon: 'fa-image', title: 'Insert Image', act: 'template', val: 'image' }
        ];

        function createToolbarHtml() {
            const buttons = BUTTON_DEFS.map(btn => {
                if (btn.sep) return '<span class="esg__tool-sep"></span>';
                const inner = btn.icon ? `<i class="fa ${btn.icon}"></i>` : btn.text;
                return `<div class="esg__tool-btn" title="${btn.title}" data-act="${btn.act}" data-val="${btn.val}">${inner}</div>`;
            }).join('');

            return `
                <div class="esg__tools-wrap">
                    ${buttons}
                    <span class="esg__tool-sep"></span>
                    <a href="https://www.steamgifts.com/about/comment-formatting" target="_blank" class="esg__tool-btn" title="Formatting Guide">
                        <i class="fa fa-info"></i>
                    </a>
                </div>
            `;
        }

        function attachToolbars() {
            $('textarea[name="description"], textarea[name="body"]').each(function () {
                const $textarea = $(this);
                if ($textarea.prev('.esg__tools-wrap').length === 0) {
                    $textarea.before(createToolbarHtml());
                }
            });
        }

        attachToolbars();

        $(document).on('click', '.comment__reply-button, .js__comment-reply', function () {
            setTimeout(attachToolbars, 100);
        });

        $(document).off('click.esgEditor').on('click.esgEditor', '.esg__tools-wrap .esg__tool-btn[data-act]', function (e) {
            e.preventDefault();
            const act = $(this).data('act');
            const val = $(this).data('val');
            const $textarea = $(this).closest('.esg__tools-wrap').next('textarea');
            const el = $textarea[0];

            if (!el || typeof FormatActions[act] !== 'function') return;

            el.focus();
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const src = el.value;

            const before = src.slice(0, start);
            const sel = src.slice(start, end);
            const after = src.slice(end);

            const result = FormatActions[act](before, sel, after, val);
            if (!result) return;

            el.value = result.text;
            el.setSelectionRange(result.start, result.end);
            $textarea.trigger('input');
        });
    }

    /* =========================================================================
     * 7. 基礎 UI 增強與全域開關功能 (Feature Toggles)
     * ========================================================================= */
    function initFeatures() {
        // 隱藏頂部 Featured Giveaway
        if (Storage.getNumber("esg_hidefeatured", 0) && (PATH.startsWith('/giveaways/') || PATH === '/')) {
            $(".featured__container").remove();
        }

        // 定時刷新點數 (每 60 秒)
        if (Storage.getNumber("esg_refresh", 0) && XSRF_TOKEN) {
            setInterval(function () {
                $.ajax({
                    url: "/ajax.php",
                    type: "POST",
                    dataType: "json",
                    data: `xsrf_token=${XSRF_TOKEN}&do=entry_insert`,
                    success: function (res) {
                        if (res && res.points !== undefined && $(".nav__points").text() !== String(res.points)) {
                            $(".nav__points").text(res.points);
                        }
                    }
                });
            }, 60000);
        }

        // 抽獎簽名產生器 (Signature Generator)
        if (PATH.startsWith('/giveaway/') && Storage.getNumber("esg_gsg", 1)) {
            const match = PATH.match(/^\/giveaway\/([a-zA-Z0-9]+)\//);
            if (match && match[1]) {
                const gaCode = match[1];
                const sigUrl = `https://steamgifts.com/giveaway/${gaCode}/signature.png`;
                const gaUrl = `https://steamgifts.com/giveaway/${gaCode}/`;
                $(".sidebar:first").append(`
                    <h3 class="sidebar__heading">Signature</h3>
                    <div class="sidebar__navigation" style="text-align:center;padding:5px;">
                        <img src="${sigUrl}" width="280px" height="53px"><br>
                        BB code:<br><input style="width:100%" onclick="this.select();" value="[url=${gaUrl}][img]${sigUrl}[/img][/url]"><br>
                        Markdown code:<br><input style="width:100%" onclick="this.select();" value="![${gaUrl}](${sigUrl})">
                    </div>
                `);
            }
        }

        // Level Bar 渲染
        const $account = $(".nav__button:contains('Account')");
        if ($account.length) {
            const levelAttr = $account.find("span:nth-child(2)").attr("title");
            const lv = parseFloat(levelAttr) || 0;
            const progress = (lv - Math.floor(lv)) * $account.outerWidth();
            $account.css("box-shadow", `inset ${progress}px 0 5px rgba(0,255,50,0.15)`);
        }

        // Fixed Header
        if (Storage.getNumber("esg_fixedheader", 1)) {
            $("header").css({ position: "fixed", width: "100%", zIndex: "100", top: "0" });
            const offsetTarget = $(".header__error").length ? $(".header__error")
                : $(".featured__container").length ? $(".featured__container")
                : $(".page__outer-wrap");
            offsetTarget.css("margin-top", "38px");
        }

        // Scroll to top 按鈕
        if (Storage.getNumber("esg_scrolltop", 1)) {
            const $btn = $('<div class="scroll-top form__submit-button">&gt;</div>').prependTo("body");
            $btn.on("click", () => $('html, body').animate({ scrollTop: 0 }, 'fast'));

            let visible = false;
            $(window).on("scroll", () => {
                const scrolled = $(window).scrollTop() > 500;
                if (scrolled !== visible) {
                    visible = scrolled;
                    visible ? $btn.fadeIn("fast") : $btn.fadeOut("fast");
                }
            });
        }
    }

    /* =========================================================================
     * 8. 側邊欄與過濾控制面板 (Sidebar & Filter Panel)
     * ========================================================================= */
    function initFilterPanel() {
        if (PATH !== '/') return;

        $(".page__heading__breadcrumbs:first").after(
            '<div class="filter" style="cursor:pointer"><i style="margin-left:5px;display:inline" class="fa fa-filter"><i style="margin-left:5px;width:10px;" class="fa fa-caret-left"></i></div>'
        );

        const f_lv_min = Storage.getNumber("esg_f_min_level", 0);
        const f_lv_max = Storage.getNumber("esg_f_max_level", 10);
        const f_ch_min = Storage.getNumber("esg_f_min_chance", 0);
        const f_ch_max = Storage.getNumber("esg_f_max_chance", 100);
        const f_p_min = Storage.getNumber("esg_f_min_points", 0);
        const f_p_max = Storage.getNumber("esg_f_max_points", 50);
        const f_c_min = Storage.getNumber("esg_f_min_copies", 1);
        const f_c_max = Math.min(Storage.getNumber("esg_f_max_copies", 1000), 1000);

        const group = Storage.getNumber("esg_f_group", 1);
        const white = Storage.getNumber("esg_f_whitelist", 1);
        const region = Storage.getNumber("esg_f_regionrestricted", 1);
        const comm = Storage.getNumber("esg_f_community", 1);

        const tableHTML = `
        <div class="filter-content pinned-giveaways" style="display:none;">
            <table class="filter_table">
                <tr>
                    <td width="50%">
                        Level <span class="f_lv">${f_lv_min === f_lv_max ? f_lv_min : `${f_lv_min} - ${f_lv_max}`}</span>
                        <div class="filter__slider form__slider_filter--level"></div>
                    </td>
                    <td width="25%"><div class="form__checkbox cb__three" data-key="esg_f_group">
                        <i class="fa fa-circle-o" ${group !== 0 ? 'style="display:none"' : ''}></i>
                        <i class="fa fa-check-circle" ${group !== 1 ? 'style="display:none"' : ''}></i>
                        <i class="fa fa-circle" ${group !== 2 ? 'style="display:none"' : ''}></i> Group
                    </div></td>
                    <td width="25%"><div class="form__checkbox cb__three" data-key="esg_f_whitelist">
                        <i class="fa fa-circle-o" ${white !== 0 ? 'style="display:none"' : ''}></i>
                        <i class="fa fa-check-circle" ${white !== 1 ? 'style="display:none"' : ''}></i>
                        <i class="fa fa-circle" ${white !== 2 ? 'style="display:none"' : ''}></i> Whitelist
                    </div></td>
                </tr>
                <tr>
                    <td>
                        Chance <span class="f_chance">${f_ch_min === f_ch_max ? f_ch_min : `${f_ch_min} - ${f_ch_max}`}</span>%
                        <div class="filter__slider form__slider_filter--chance"></div>
                    </td>
                    <td><div class="form__checkbox cb__three" data-key="esg_f_regionrestricted">
                        <i class="fa fa-circle-o" ${region !== 0 ? 'style="display:none"' : ''}></i>
                        <i class="fa fa-check-circle" ${region !== 1 ? 'style="display:none"' : ''}></i>
                        <i class="fa fa-circle" ${region !== 2 ? 'style="display:none"' : ''}></i> Region restricted
                    </div></td>
                    <td><div class="form__checkbox cb__three" data-key="esg_f_community">
                        <i class="fa fa-circle-o" ${comm !== 0 ? 'style="display:none"' : ''}></i>
                        <i class="fa fa-check-circle" ${comm !== 1 ? 'style="display:none"' : ''}></i>
                        <i class="fa fa-circle" ${comm !== 2 ? 'style="display:none"' : ''}></i> Community Voted
                    </div></td>
                </tr>
                <tr>
                    <td>
                        Entry cost <span class="f_points">${f_p_min === f_p_max ? f_p_min : `${f_p_min} - ${f_p_max}`}</span>P
                        <div class="filter__slider form__slider_filter--points"></div>
                    </td>
                    <td colspan="2"></td>
                </tr>
                <tr>
                    <td>
                        Copies <span class="f_copies"><span class="f_min_copy">${f_c_min}</span> - <span class="f_max_copy">${f_c_max === 1000 ? '&infin;' : f_c_max}</span></span>
                        <div class="filter__slider form__slider_filter--copies"></div>
                    </td>
                    <td><span style="float:right;margin-right:30px">Hints:</span></td>
                    <td style="color:#587cd7">
                        <i class="fa fa-circle-o"></i> Hide <i class="fa fa-check-circle"></i> Show <i class="fa fa-circle"></i> Only
                    </td>
                </tr>
            </table>
        </div>`;

        $(".page__heading:first").after(tableHTML);

        $(".filter").on("click", function () {
            $(".filter-content").slideToggle(200, function () {
                const hidden = $(this).is(":hidden");
                $(".filter").find(".fa:last").toggleClass("fa-caret-left", hidden).toggleClass("fa-caret-down", !hidden);
            });
        });

        $(".cb__three").on("click", function () {
            const key = $(this).data("key");
            const current = Storage.getNumber(key, 1);
            const next = (current + 1) % 3;
            Storage.set(key, next);

            $(this).find("i").hide();
            if (next === 0) $(this).find(".fa-circle-o").show();
            else if (next === 1) $(this).find(".fa-check-circle").show();
            else if (next === 2) $(this).find(".fa-circle").show();

            applyFilters();
        });

        $('.form__slider_filter--level').slider({
            range: true, values: [f_lv_min, f_lv_max], min: 0, max: 10,
            slide: (e, ui) => {
                Storage.set("esg_f_min_level", ui.values[0]);
                Storage.set("esg_f_max_level", ui.values[1]);
                $(".f_lv").text(ui.values[0] === ui.values[1] ? ui.values[0] : `${ui.values[0]} - ${ui.values[1]}`);
                applyFilters();
            }
        });

        $('.form__slider_filter--points').slider({
            range: true, values: [f_p_min, f_p_max], min: 0, max: 50,
            slide: (e, ui) => {
                Storage.set("esg_f_min_points", ui.values[0]);
                Storage.set("esg_f_max_points", ui.values[1]);
                $(".f_points").text(ui.values[0] === ui.values[1] ? ui.values[0] : `${ui.values[0]} - ${ui.values[1]}`);
                applyFilters();
            }
        });

        $('.form__slider_filter--copies').slider({
            range: true, values: [f_c_min, f_c_max], min: 1, max: 1000,
            slide: (e, ui) => {
                Storage.set("esg_f_min_copies", ui.values[0]);
                Storage.set("esg_f_max_copies", ui.values[1]);
                const maxStr = ui.values[1] === 1000 ? '&infin;' : ui.values[1];
                $(".f_copies").html(`<span class="f_min_copy">${ui.values[0]}</span> - <span class="f_max_copy">${maxStr}</span>`);
                applyFilters();
            }
        });

        $('.form__slider_filter--chance').slider({
            range: true, values: [f_ch_min, f_ch_max], min: 0, max: 100, step: 0.1,
            slide: (e, ui) => {
                Storage.set("esg_f_min_chance", ui.values[0]);
                Storage.set("esg_f_max_chance", ui.values[1]);
                $(".f_chance").text(ui.values[0] === ui.values[1] ? ui.values[0] : `${ui.values[0]} - ${ui.values[1]}`);
                applyFilters();
            }
        });
    }

    /* =========================================================================
     * 9. 無限滾動 (Infinite Scroll)
     * ========================================================================= */
    function initInfiniteScroll() {
        if (!Storage.getNumber("esg_autoscroll", 1) || $('.pagination').length === 0) return;

        let loading = false;
        let isLastPage = $(".pagination__navigation:contains('Next')").length === 0;
        let currentPage = Number($('.pagination__navigation .is-selected').attr('data-page-number')) || 1;

        const baseUrl = window.location.href;
        const $loader = $('<img src="https://raw.githubusercontent.com/nandee95/Extended_Steamgifts/master/img/loading.gif" class="page-loading">');
        $('.giveaway__row-outer-wrap:last').parent().after($loader);

        function getNextUrl(page) {
            const url = new URL(baseUrl);
            url.searchParams.set('page', page);
            return url.toString();
        }

        $(window).on('scroll', function () {
            if (loading || isLastPage) return;

            if ($(window).scrollTop() + $(window).height() > $(document).height() - 800) {
                loading = true;
                $loader.show();
                const targetPage = currentPage + 1;

                $.ajax({
                    url: getNextUrl(targetPage),
                    method: 'GET',
                    success: function (html) {
                        const $parsed = $($.parseHTML(html));
                        isLastPage = $parsed.find('.pagination__navigation:contains("Next")').length === 0;

                        const $newRows = $parsed.find('.giveaway__row-outer-wrap');
                        if ($newRows.length) {
                            const $container = $('.giveaway__row-outer-wrap:last').parent();
                            $container.append(
                                `<div class="page__heading"><div class="page__heading__breadcrumbs"><a>Giveaways</a> <i class="fa fa-angle-right"></i> Page ${targetPage}</div></div>`
                            );
                            $newRows.each(function () {
                                const $el = $(this);
                                decorateGiveaway($el);
                                $container.append($el);
                            });
                            applyFilters();
                        }
                        currentPage = targetPage;
                    },
                    complete: function () {
                        loading = false;
                        $loader.hide();
                    }
                });
            }
        });
    }

    /* =========================================================================
     * 10. 主程式生命週期 (Main Entry)
     * ========================================================================= */
    function init() {
        // 1. 裝飾現有抽獎條目
        $('.giveaway__row-outer-wrap').each(function () {
            decorateGiveaway($(this));
        });

        // 2. 導航與介面初始化
        initNavigationTabs();
        initAccountPages();
        initFeatures();
        initFilterPanel();
        applyFilters();

        // 3. 評論編輯器與無限滾動
        initCommentEditor();
        initInfiniteScroll();
    }

    $(document).ready(init);

})(jQuery);
