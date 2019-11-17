module.exports = function(api, pluginInfo) {


	var options = pluginInfo.options;
	var $ = api.window.$;
	var m = window;

	// kaleidoscope
	var timer;
	var visualsContextMenu;
	var _currentImagesA = [];
	var _currentImageId = 0;
	var _currentImageO = null;
	var _currentImage = null;
	var _previousImageId = 0;
	var isPaused = false;
	var isRandom = false;



	function _init() {
		setPane();
		setSections();
		setKaleidoscope();
		startTimer();
	}


	function startTimer() {
		if (timer != null) clearInterval(timer);

		$('#kaleidoscope-pause-icon').hide();
		timer = setInterval(function () {
			switchImage();
		}, options.changeImageAfterMiliseconds);
	}
	
	function stopTimer() {
		clearInterval(timer);
		timer = null;
	}

	function pauseKaleidoscope() {
		// pause
		stopTimer();
		$('#kaleidoscope-pause-icon').show();
		isPaused = true;
	}

	function startKaleidoscope() {
		// resume
		isPaused = false;
		startTimer();
		switchImage();
	}

	function reloadAndStart() {
		isPaused = false;
		// $("#visuals-main-container").shake(60, 7, 4);
		$('#kaleidoscope-image-b').fadeTo(1, 0);
		$('#kaleidoscope-image-a').fadeTo(100, 0);
		$('#kaleidoscope-image-holder').animate({width: "toggle"}, 150).animate({width: "toggle"}, 150);
		stopTimer();
		setVisuals();
	}

	function setPane() {
		m.universalPane.registerPane("wm-visuals", "Visuals", {
			width: 300
		});
		$("#wm-visuals").append('<div id="visuals-main-container"></div>');
		$("#wm-visuals").append('<div id="visuals-reload"></div>');
		$("#visuals-reload").append('<span id="visuals-reload-button" class="awf">&#xf01e;</span>');
		if (m.os.platform() != 'darwin') $('#visuals-main-container').perfectScrollbar();


		$("#visuals-reload-button").on("click", function(e) {
			reloadAndStart();
		});

		// document load / swap
		m._editor.on("swapDoc", function (sevent) {
			if (m.universalPane.isPaneVisible("wm-visuals")) {
				if (!isPaused) {
					reloadAndStart();
				}
			}
		});

		// set command palette
		m.commandPalette.registerPaletteItem({
			id: 'visuals-reload',
			string: 'Visuals: Refresh Images',
			shortcut: "Ctrl+Alt+V",
			action: '_plugins["visuals"].reloadAndStart()',
			type: "eval",
			sublist: [],
			persist: false,
			icon: "&#xf03e;"
		});

		
	

		// Keyboard shortcut
		m._editor.on("keydown", function (cm, e) {
			if (e.keyCode == 86 && e.altKey && (e.ctrlKey || e.metaKey)) {
				reloadAndStart();
			}
		});
		
	}

	function getContextMenu(imageId) {

		imageId = parseInt(imageId.toString(), 10);
		// context menu
		visualsContextMenu = new m.gui.Menu({
			'type': 'menubar'
		});

		visualsContextMenu.append(new m.gui.MenuItem({
			label: 'Copy markdown link',
			click: function () {
				copyImageMd(_currentImagesA[imageId].link);
			}
		}));

		visualsContextMenu.append(new m.gui.MenuItem({
			label: 'Send to repository',
			click: function () {
				copyImageToRepository(_currentImagesA[imageId].link);
			}
		}));

		visualsContextMenu.append(new m.gui.MenuItem({
			label: 'Get random set',
			click: function () {
				isRandom = true;
				reloadAndStart();
			}
		}));

		return visualsContextMenu;
	}

	function setSections() {

		addSection("kaleidoscope", "", { width: '100%', showArrow: false, expanded: true, toggleMode: "click", headerPosition: "bottom" });
		addSection("visuals", "", { width: '100%', showArrow: false, expanded: true, toggleMode: "none", headerPosition: "top" });
	}

	function addSection(name, contentHtml, options) {

		var safeName = name.replace(/\s+/g, "-");
		$('#visuals-main-container').append('<div id="visuals-' + safeName + '" class="visuals-section">  <div class="visuals-section-header">' + '' + '</div><div class="visuals-section-content">' + contentHtml + '</div></div>');
		$('#visuals-' + safeName).jqxExpander(options);
	}




	function setKaleidoscope() {

		$('#visuals-kaleidoscope').jqxExpander('setHeaderContent', '<span class="awf">&#xf106;</span>');
		
		var html = '<div id="kaleidoscope-image-holder"><div id="kaleidoscope-image-a"></div><div id="kaleidoscope-image-b"></div><div id="kaleidoscope-pause-icon">&#xf28c;</div>';
		$('#visuals-kaleidoscope').jqxExpander("setContent", html);

		
		$("#kaleidoscope-image-holder").contextmenu(function (e) {
			// var id = JSON.parse(JSON.stringify(_previousImageId));
			getContextMenu(_previousImageId).popup(e.clientX, e.clientY);
		});

		// show pause icon
		$('#kaleidoscope-image-holder').on("click", function (e) {
			if (e.ctrlKey || e.metaKey) {
				copyImageMd(_currentImagesA[_previousImageId].link);
			} else {
				if (timer) {
					pauseKaleidoscope();
				} else {
					startKaleidoscope();
				}
			}
		});
	}
	

	function setVisuals() {

		var t = getRelevantText();

		var kw = m.stats.getKeyWords(t, {
			wordsReturned: options.maxSearchTokens,
			frequencyWeight: 100,
			positionWeight: 10,
			complexWeight: 50,
			stopWords: options.stopWords
		});

		if (kw.length < 1) {
			m.wm.showNotice("Visuals: Nothing to show!");
			return;
		}

		// build query
		var q = buildQuery(kw, t);

		getImages(q,  function(arr) {

			
			var html = "";
			var queryLabel = q.replace(/\+/g, " ").replace(/[\t\n ]+/g, "<br>").trim().toUpperCase();

			var numOfItems = options.maxImagesPerQuery <= arr.length ? options.maxImagesPerQuery : arr.length;
			for (var i = 0; i < numOfItems; i++) {
				html += '<figure><img id="visuals-image-' + i.toString() + '" class="visuals-image" src="' + arr[i].thumb + '" link="' + arr[i].link + '" title="' + arr[i].label + '"><figcaption class="kaleidoscope-image-label">' + arr[i].label + '</figcaption></figure>';
			}
			// title="' + arr[i].label + '"
			
			$('#visuals-visuals').jqxExpander("setContent", html);
			
			$('.kaleidoscope-image-label').css("display", options.labelsUnderThumbnails ? "block" : "none");
			$('.visuals-image ').css("margin-bottom", options.labelsUnderThumbnails ? ".2em" : ".6em");
			$('#visuals-visuals').jqxExpander('setHeaderContent', '<br>Based on:<br><br>' + queryLabel);
			
			
			$(".visuals-image").on("click", function(e) {
				
				// if (e.ctrlKey || e.metaKey) {
				// 	copyImageMd($(this).attr('link'));
				// }

				_currentImageId = parseInt($(this).attr('id').replace('visuals-image-', ''), 10);

				
				switchImage(true);
				pauseKaleidoscope();
				scrollToTop();
				
			});

			$(".visuals-image").contextmenu(function (e) {
				getContextMenu(parseInt($(this).attr('id').replace('visuals-image-', ''), 10)).popup(e.clientX, e.clientY);
			});


			$("#visuals-visuals img").one("load", function () {
				$(this).fadeTo(1000, 1);
			});

			isRandom = false;

		});
	}

	function switchImage(thumbOnError) {
		// if (thumbOnError === undefined) thumbOnError = false;

		if (_currentImagesA.length > 0 && m.universalPane.isPaneVisible("wm-visuals")) {

			_currentImageId = _currentImageId < _currentImagesA.length ? _currentImageId : 0;
			if (_currentImage) {
				_currentImage.remove();
			}
			
			// load image
			_currentImage = $('<img/>').attr('src', _currentImagesA[_currentImageId].link).on('load', function () {
				
				$(this).remove(); // prevent memory leaks

				// put previous image to background
				if (_currentImageId > 0) {
					$('#kaleidoscope-image-b').css({
						"background-image": 'url(' + _currentImagesA[_previousImageId].link + ')',
						"opacity": "1"
					});
				}

				// set new image to foreground
				$('#kaleidoscope-image-a').css({
					"background-image": 'url(' + _currentImagesA[_currentImageId].link + ')',
					"opacity": "0"
				});
				
				$('#kaleidoscope-image-holder').attr('title', _currentImagesA[_currentImageId].label);

				// fade out old, fade in new
				$('#kaleidoscope-image-b').fadeTo(options.imageFadeInMiliseconds, 0);
				$('#kaleidoscope-image-a').fadeTo(options.imageFadeInMiliseconds, 1);

				_currentImageO = _currentImagesA[_currentImageId];
				_previousImageId = _currentImageId;
				_currentImageId++;

			}).on('error', function (e) {

				if (thumbOnError) {
					var tempO = JSON.stringify(_currentImagesA[_currentImageId]);
					_currentImagesA[_currentImageId].link = JSON.parse(tempO).thumb;
				} else {
					_currentImageId++;
				}
				
				switchImage();
			});
		}
	}

	function getImages(q, callback) {

		$.ajax({
				url: 'https://www.google.si/search?q=' + q + '&hl=en&oq=images&site=webhp&source=lnt&tbm=isch&tbas=0&biw=1280&bih=576&dpr=2&tbs=itp:photo' + (options.hiResImagesOnly ? ',islt:svga,isz:l' : ''),
				statusCode: {
					404: function() {}
				}
			})
			.done(function(data) {
				// get thumbs
				var thumbArr = data.match(/"tu":"(.*?)"/g)
				
				if (!Array.isArray(thumbArr)) {
					m.wm.showNotice("Visuals: Nothing to show!");
					return;
				}
				
				// get thumbs
				thumbArr = thumbArr.map(function (item) {
					return item.replace(/"/g, "").replace(/tu:/g, "").replace(/\\u003d/g, "=").replace(/\\u0026s/g, "");
				});

				// get links
				var linksArr = data.match(/"ou":"(.*?)"/g).map(function(item) {
					return item.replace(/"/g, "").replace(/ou:/g, "").replace(/\\u003d/g, "=");
				});

				// get labels
				var labelsArr = data.match(/"pt":"(.*?)"/g).map(function(item) {
					// return item.replace(/"/g, "").replace(/s:/g, "").replace(/\\u[\d\w]{1,6}/g, "");
					return item.replace(/"/g, "").replace(/pt:/g, "").replace(/\\u[\d\w]{1,6}/g, "");
				});


				var imagesArr = [];
				for (var i = 0; i < thumbArr.length; i++) {

					linksArr[i] = linksArr[i].replace(/\.jpg\?.+$/, '.jpg').replace(/\.gif\?.+$/, '.gif').replace(/\.jpeg\?.+$/, '.jpeg'); // strip after .jpg / .gif if there

					imagesArr.push({
						thumb: thumbArr[i],
						link: linksArr[i],
						linkNoSSL: linksArr[i].replace(/^https/, 'http'),
						label: labelsArr[i] == "" ? "No label" : labelsArr[i]
					});
				}
				console.log("Visuals: new set loaded!");

				_currentImagesA = imagesArr; //reset
				_currentImageId = 0; // reset
				if (timer == null && !isPaused) startKaleidoscope();
				callback(imagesArr);
			})
			.fail(function(e) {
				m.showNotice("Check your internet connection!");
			});
	}



	function getRelevantText() {
		var t = "";
		// var noOflines = m._editor.lineCount();
		//t = m._editor.getLine(m._editor.getCursor().line);
		// t = m._editor.findSentenceAt(m._editor.getLine(m._editor.getCursor().line), m._editor.getCursor()).text;

		if (isRandom || m._editor.getValue().trim() == "") {
			t = getRandomWords();
		} else if (m._editor.somethingSelected()) {
			t = m._editor.getSelection();
		} else {
			t = m._editor.getValue();
		}
		return t;
	}


	function buildQuery(keyWordsA, text) {

		var wCount = m.stats.getWords(text).count;

		if (wCount <= options.maxWordsForDirectQuery) {
			return text.trim();
		}
		
		var q = "";		
		for (var i = 0; i < keyWordsA.length; i++) {
			q += (i != 0 ? "+" : "") + keyWordsA[i].label; //%2B
		}
	
		return q;
	}

	function copyImageToRepository(link) {
		var t = '![](' + link + ')';
		m._editor.sendToRepository(t);
		m.wm.showNotice("Image sent to repository!");
	}
	
	function copyImageMd(link) {
		var clipboard = m.gui.Clipboard.get();
		clipboard.set('![](' + link + ')', 'text');
		m.wm.showNotice("Copied as markdown image!");
	}

	function scrollToTop() {
		$("#visuals-main-container").animate({
			scrollTop: 0
		}, 500);
	}

	function getRandomWords() {
		
		var nouns = options.nouns.split(" ");
		var adjectives = options.adjectives.split(" ");
		var techniques = options.techniques.split(" ");

		var nou = Math.floor(Math.random() * nouns.length);
		var adj = Math.floor(Math.random() * adjectives.length);
		var tec = Math.floor(Math.random() * techniques.length);

		return adjectives[adj] + " " + nouns[nou] + " " + techniques[tec];
	}

	return {
		_init: _init,
		setVisuals: setVisuals,
		reloadAndStart: reloadAndStart
	};
};