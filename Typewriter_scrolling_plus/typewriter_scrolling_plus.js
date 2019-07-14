module.exports = function(api, pluginInfo) {


	var options = pluginInfo.options;
	var $ = api.window.$;
	var m = window;
	var cm = m._editor;


	var lastPosition = 0;
	var rullerElt;


	function _init() {
		setPaletteCommands();
		if (m.localStorage.getItem("VIEW_TYPEWRITER_SCROLLING_PLUS") === null) {
			m.localStorage["VIEW_TYPEWRITER_SCROLLING_PLUS"] = 0;
		}
	}


	function setPaletteCommands() {
		m.commandPalette.registerPaletteItem({
			id: 'typewriter_scrolling_plus',
			string: 'View: Toggle Typewriter Scrolling Plus on / off',
			shortcut: "",
			action: '_plugins["typewriter_scrolling_plus"].toggleTSP()',
			type: 'eval',
			sublist: [],
			persist: false,
			icon: "&#xf06e;",
			widget: {
				type: "setting",
				value: "VIEW_TYPEWRITER_SCROLLING_PLUS"
			}
		});
	}


	function toggleTSP() {
		if (m.localStorage["VIEW_TYPEWRITER_SCROLLING_PLUS"] == 1) {
			m.localStorage["VIEW_TYPEWRITER_SCROLLING_PLUS"] = 0;
			disableTSP();
			m.wm.showNotice("Typewriter scrolling Plus is disabled", true);

		} else {
			m.localStorage["VIEW_TYPEWRITER_SCROLLING_PLUS"] = 1;
			enableTSP();
			m.wm.showNotice("Typewriter scrolling Plus is enabled", true);

		}
	}

	m.win.on('enter-fullscreen', function() {
		enableTSP();
	});

	m.win.on('leave-fullscreen', function() {
		disableTSP();
	});

	cm.on("refresh", function(cm) {
		if (cm.state.rulerDiv) {
			moveRuller(cm);
		}
	});


	$('#grid').on('click', function(e) {
		if (e.target !== this || !isFullScreen()) return;
		moveTextColumn(0, 300);
		moveRuller(cm);
	});


	function enableTSP() {

		// scroll to cursor
		scrollTSP(cm, null);

		
		cm.on("change", scrollTSP);

		// create ruller element
		if (options.show_cursor_ruller) {
			cm.state.rulerDiv = cm.display.lineSpace.parentElement.insertBefore(m.document.createElement("div"), cm.display.lineSpace);
			cm.state.rulerDiv.className = "CodeMirror-rulers";
    		cm.state.rulerDiv.style.minHeight = (cm.display.scroller.offsetHeight + 30) + "px";

			var left = cm.cursorCoords(cm.getCursor(), "local").left;
			rullerElt = m.document.createElement("div");
			rullerElt.className = "CodeMirror-ruler";
			rullerElt.style.borderColor = options.cursor_ruller_color;
			rullerElt.style.borderLeftStyle = options.cursor_ruller_style;
			rullerElt.style.borderLeftWidth = 1;
			rullerElt.style.left = left + "px";
			cm.state.rulerDiv.appendChild(rullerElt);
			cm.on("cursorActivity", moveRuller);
		}
		
	}


	function disableTSP() {
		resetUI();
		cm.off("change", scrollTSP);

		if (options.show_cursor_ruller)
			cm.off("cursorActivity", moveRuller);
	}


	function resetUI() {
		moveTextColumn(0, 0);
		if (cm.state.rulerDiv) {
			cm.state.rulerDiv.parentElement.removeChild(cm.state.rulerDiv);
			cm.state.rulerDiv = null;
		}
	}

	function scrollTSP(cm, obj) {

		if (isFullScreen()) {
			var cursorPos = cm.cursorCoords(true, "local");
			var w = $("#editor-placeholder").width();
			var np = w / 2 - cursorPos.left - 20;

			if (Math.abs(np - lastPosition) <= cm.defaultCharWidth() * 5) {
				moveTextColumn(np, 0);
			} else {
				moveTextColumn(np, options.carriage_return_speed);
			}
			lastPosition = np;
		} else {
			resetUI();
		}
	}

	function moveRuller(cm) {
		if (isFullScreen() && options.show_cursor_ruller) {
			
			if (!cm.state.rulerDiv) {
				enableTSP();
			}

			// move ruller
			var left = cm.cursorCoords(cm.getCursor(), "local").left;
			rullerElt.style.left = left + "px";
		} else {
			resetUI();
		}
	}


	function moveTextColumn(left, speed) {
		if (speed === 0) {
			$("#editor-placeholder").css({
				"left": left + "px"
			});
		} else {
			$("#editor-placeholder").animate({
				"left": left + "px"
			}, speed);
		}
	}

	function isFullScreen() {
		return (m.localStorage["VIEW_TYPEWRITER_SCROLLING_PLUS"] == 1 && m.win.isFullscreen && m.localStorage.VIEWPORT_SOURCES_PANE_VISIBLE == 0 && m.localStorage.VIEWPORT_DOCUMENT_PANE_VISIBLE == 0 && m.localStorage.VIEWPORT_MODULE_PANE_VISIBLE == 0)
	}



	return {
		_init: _init,
		toggleTSP: toggleTSP
	};
};