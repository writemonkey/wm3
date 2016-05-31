module.exports = function(api, pluginInfo) {

	var options = pluginInfo.options;
	var $ = api.window.$;
	var w = window;


	var soundsEnabled = false;


	function _init() {
		registerCommands();
	}


	// get everage word count of all pomodoros then show individual pomodoro with its score
	// everage is 1em



	function registerCommands() {
		
		w.commandPalette.registerPaletteItem({
				id: 'clickClack-toggle-onoff',
				string: 'Sounds: Click Clack: Enable/Disable Typing Sounds',
				shortcut: "",
				action: '',
				type: "sublist",
				sublist: '_plugins["click_clack"].getSchemesPaletteItems()',
				persist: false
			}
		);
	}

	function getInstalledSchemes() {
		var pth = pluginInfo.plugin_dir_path + '/schemes';
		var schemesNames = w.fs.readdirSync(pth).filter(function(file) {
			return w.fs.statSync(w.path.join(pth, file)).isDirectory();
		});
		return schemesNames;
	}


	function getSchemesPaletteItems() {

		var objectsA = [];
		var dirsA = getInstalledSchemes();

		objectsA.push({
			string: "Disable Typing Sounds",
			shortcut: "",
			action: '_plugins["click_clack"].unloadAll()',
			type: "eval",
			sublist: [],
			persist: false
		});

		for (var i = 0; i < dirsA.length; i++) {

			var item = {
				string: "Enable: " + dirsA[i],
				shortcut: "",
				action: '_plugins["click_clack"].enableScheme("' + dirsA[i] + '")',
				type: "eval",
				sublist: [],
				persist: false
			};
			objectsA.push(item);
		}
		return objectsA;
	}



	var keyS, key2S, enterS, deleteS, spaceS;
	
	function enableScheme(schemeName) {

		unloadAll();
		soundsEnabled = true;

		var options = {
			urls: [],
			autoplay: false,
			loop: false,
			volume: pluginInfo.options.volume
		}

		options.urls = ['./plugins/clickClack/schemes/' + schemeName + '/key.wav'];
		keyS = new w.Howl(options);
		options.urls = ['./plugins/clickClack/schemes/' + schemeName + '/key2.wav'];
		key2S = new w.Howl(options);
		options.urls = ['./plugins/clickClack/schemes/' + schemeName + '/enter.wav'];
		enterS = new w.Howl(options);
		options.urls = ['./plugins/clickClack/schemes/' + schemeName + '/delete.wav'];
		deleteS = new w.Howl(options);
		options.urls = ['./plugins/clickClack/schemes/' + schemeName + '/space.wav'];
		spaceS = new w.Howl(options);
		

		w._editor.on("keydown", function(cm, e) {

			// do nothing if disabled
			if (!soundsEnabled) return;
			
			// exit if modifiers
			if (e.altKey || e.ctrlKey || e.metaKey) return;
			// stop all sounds currently playing
			stopAll();

			switch (e.keyCode) {
				case 81:
				case 84:
				case 85:
				case 79:
				case 76:
				case 74:
				case 71:
				case 68:
				case 83:
				case 69:
				case 88:
				case 86:
				case 78:
				case 77:
					key2S.play();
					break;
				case 32:
					spaceS.play();
					break;
				case 13:
					enterS.play();
					break;
				case 8:
				case 46:
					deleteS.play();
					break;
				case 20:
				case 16:
				case 27:
				case 112:
				case 113:
				case 114:
				case 115:
				case 116:
				case 117:
				case 118:
				case 119:
				case 120:
				case 121:
				case 122:
				case 123:
				case 37:
				case 39:
				case 38:
				case 40:
				case 45:
				case 36:
				case 33:
				case 46:
				case 35:
				case 34:
				case 144:
				case 91:
				case 92:
				case 93:
					break;
				default:
					keyS.play();
			}
			
		});


	}

	function stopAll() {
		keyS.stop();
		key2S.stop();
		enterS.stop();
		deleteS.stop();
		spaceS.stop();
	}

	function unloadAll() {
		soundsEnabled = false;
		if (keyS) keyS.unload();
		if (key2S) key2S.unload();
		if (enterS) enterS.unload();
		if (deleteS) deleteS.unload();
		if (spaceS) spaceS.unload();
	}




	return {
		_init: _init,
		getSchemesPaletteItems: getSchemesPaletteItems,
		enableScheme: enableScheme,
		unloadAll: unloadAll
	};

};
