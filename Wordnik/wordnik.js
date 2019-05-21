module.exports = function(api, pluginInfo) {

	var options = pluginInfo.options;
	var $ = api.window.$;
	var m = window;


	var currentQuery = "";

	var definitionIndex = 0;
	var definitionsArr = [];

	var imageIndex = 0;
	var imagesArr = [];

	var lookupHistory = [];

	function _init() {
		setPane();
		setCommands();
		setBlankPlaceholder();
	}

	function setPane() {
		m.universalPane.registerPane("wm-wordnik", "Wordnik", {
			width: 300
		});
		$("#wm-wordnik").append('<div id="wordnik-main-container"></div>');
		$("#wm-wordnik").append('<div id="wordnik-reload"></div>');
		$("#wordnik-reload").append('<span id="wordnik-reload-button" class="awf">&#xf01e;</span>');
		$("#wordnik-main-container").append('<div id="wordnik-definitions"></div>');
		$("#wordnik-main-container").append('<div id="wordnik-images"></div>');
		$("#wordnik-main-container").append('<div id="wordnik-related"></div>');

		if (m.os.platform() != 'darwin') $('#wordnik-main-container').perfectScrollbar();

	}

	function setCommands() {

		// Command palette
		m.commandPalette.registerPaletteItem({
			id: 'wordnik_lookup',
			string: 'Wordnik: Lookup Word under Cursor for Synonyms, Definitions ...',
			shortcut: "Ctrl+Alt+T",
			action: '_plugins["wordnik"].lookupWord()',
			type: 'eval',
			sublist: [],
			icon: "&#xf02d;",
			persist: false
		});
		// Keyboard shortcut
		m._editor.on("keydown", function(cm, e) {
			if (e.keyCode == 84 && e.altKey && (e.ctrlKey || e.metaKey)) {
				lookupWord();
				m._editor.focus();
			}
		});

		$("#wordnik-reload-button").on("click", function(e) {
			lookupWord();
			m._editor.focus();
		});

		$("#wordnik-definitions").on("click", function(e) {
			e.stopPropagation();
			toggleDefinitions(e.offsetX);
		});

		$("#wordnik-images").on("click", function(event) {
			if (event.shiftKey) {
				m.opener('https://www.google.si/search?q=' + currentQuery + '&hl=en&site=webhp&source=lnms&tbm=isch&sa=X');
			} else {
				toggleImages(event.offsetX);
			}
		});

	}


	function composeWordnikApiRequest(q) {
		q = q.trim().replace(/\s+/gi, '+');
		var request = options.baseUrl + q + '?multi';
		var resources = options.resources;
		for (var i = 0; i < resources.length; i++) {
			if (resources[i].enabled != 'true')
				continue;
			var num = (i + 1).toString();
			var resO = resources[i].apiData;
			var resS = "";
			for (var key in resO) {
				if (resO.hasOwnProperty(key)) {
					resS += '&' + key + '.' + num + '=' + resO[key];
				}
			}
			request += resS;
		}
		return request + '&api_key=' + options.apiKey;
	}


	function lookupWord(w) {

		m.universalPane.switchPaneAndShow('wm-wordnik');

		w = (!w) ? getWordFromEditor() : w;
		w = w.trim().replace(/\s+/g, '+');

		$('#wordnik-definitions, #wordnik-related, #wordnik-images').empty();
		$("#wordnik-blank-placeholder").remove();

		
		definitionIndex = 0;
		definitionsArr = [];
		imageIndex = 0;
		imagesArr = [];
		currentQuery = w;

		// GET http://api.wordnik.com:80/v4/word.json/dog/definitions?limit=20&includeRelated=false&useCanonical=true&includeTags=false&api_key=7b9688581d72679e9200f01a7bf05022d65b7fa9e1d13e622
		// make API cals
		var defUrl = options.baseUrl + w +
			'/definitions?limit=20&includeRelated=false&useCanonical=true&includeTags=false&api_key=' +
			options.apiKey;
		callWordnikApi(defUrl, '_def');

		var relUrl = options.baseUrl + w +
			'/relatedWords?relationshipTypes=' + options.includeRelatedTypes.replace(/\s+/g, '') + '&useCanonical=true&limitPerRelationshipType=' + options.maxHitsPerType + '&api_key=' +
			options.apiKey;
		callWordnikApi(relUrl, '_rel');

		if (options.includeReverseDictionary == true) {
			var reverseUrl = options.baseUrl2 +
				'reverseDictionary?query=' + w + '&minCorpusCount=5&expandTerms=synonym&limit=' + options.maxHitsReverseDictionary + '&api_key=' +
				options.apiKey;
			m.setTimeout(function() { // ensure it is shown last hack
				callWordnikApi(reverseUrl, '_reverse');
			}, 200);
		}
	}


	function callWordnikApi(url, type) {
		$.getJSON(url, function() {}).done(function(data) {
			switch (type) {
				case '_def':
					definitionsArr = data;
					showDefinitionsSection();
					break;

				case '_rel':
					showRelatedSection(data);
					break;

				case '_reverse':
					if (data && data.results && data.results.length > 0) {
						var wordsA = data.results.map(function(item) {
							return item.word;
						});
						var newObject = {};
						newObject.relationshipType = 'reverse-dictionary';
						newObject.words = wordsA.distinctByCount();
						showWordCloudSection(newObject);
					}
					break;

				default:

			}

		}).fail(function() {

		}).always(function() {

		});
	}


	function showRelatedSection(o) {

		if (o.length <= 0) return;

		// sort
		var types = options.includeRelatedTypes.replace(/\s+/g, '').split(',');
		o = o.map(function(item) {
			item.position = types.indexOf(item.relationshipType);
			return item;
		});
		o.sort(function(a, b) {
			return a.position - b.position;
		});


		for (var i = 0; i < o.length; i++) {
			showWordCloudSection(o[i]);
		}


		$("#wordnik-related").slideDown("fast");

	}

	function showWordCloudSection(o) {

		if (o.length <= 0) return;

		var cloudA = o.words.map(function(w) {
			return {
				word: w.trim(),
				type: o.relationshipType,
				value: Math.floor(Math.random() * 100 - 1)
			};
		});


		var sectionId = 'word-cloud-section-' + o.relationshipType;

		$("#wordnik-related").append('<div class="word-cloud-header">' + o.relationshipType.replace(/-/g, ' ').toUpperCase() + '</div><div id="' + sectionId + '"></div>');

		var source = {
			localdata: cloudA,
			datatype: "array",
			datafields: [{
				name: 'word'
			}, {
				name: 'value'
			}, {
				name: 'type'
			}]
		};

		var dataAdapter = new $.jqx.dataAdapter(source, {});

		$('#' + sectionId).jqxTagCloud({
			source: dataAdapter,
			sortBy: 'none',
			displayValue: false,
			displayMember: 'word',
			valueMember: 'value',
			takeTopWeightedItems: false,
			minFontSize: options.minFontSize,
			maxFontSize: options.maxFontSize,
			minColor: options.minColor,
			maxColor: options.maxColor,

			tagRenderer: function(record, minValue, range) {
				var el = $('<span class="wordnik-word">' + record.word + '</span>');
				if (record.type == 'antonym') {
					el.css('color', '#C23049');
				}
				return el;
			}
		});


		$('#' + sectionId).on('itemClick', function(event) {
			if (event.args.originalEvent.metaKey || event.args.originalEvent.ctrlKey) {
				lookupWord(event.args.label);
			} else if (event.args.originalEvent.shiftKey) {
				m.opener('https://en.wikipedia.org/wiki/' + event.args.label.replace(/\s+/g, '+'));
			} else {
				m._editor.replaceSelection(event.args.label, 'around');
				m._editor.focus();
			}
		});
	}


	function showDefinitionsSection() {
		$("#wordnik-definitions").empty();

		if (definitionsArr.length <= 0) return;

		var def = definitionsArr[definitionIndex].text;
		var partOfSpeech = definitionsArr[definitionIndex].partOfSpeech;

		// def = def.replace(/(\w+)/g, '<span class="wordnik-definition-word">$1</span>');

		var numLabel = '<div style="font-style: normal; font-size: .9em; margin-bottom: .75em;"><strong class="wordnik-definition-word" >' + definitionsArr[definitionIndex].word.toUpperCase() + '</strong>&nbsp;&nbsp;<span style="font-size: .7em;">' + (definitionIndex + 1).toString() + ' / ' + definitionsArr.length + '</span></div>';
		var text = '<p>' + def + '</p>';
		var hr = '<div style="font-style: normal; font-size: .65em; text-align: center; margin: 5px;"><span class="awf" id="wordnik-image-button">&#xf030;</span></div>';

		$('#wordnik-definitions').html(numLabel + text + hr);
		$("#wordnik-definitions").slideDown("fast");


		// $(".wordnik-definition-word").on("click", function(e) {
		// 	e.stopPropagation();

		// 	if (e.metaKey || e.ctrlKey) {
		// 		m._editor.replaceSelection($(this).html().toLowerCase(), 'around');
		// 		m._editor.focus();
		// 	} else {
		// 		lookupWord($(this).html().toLowerCase());
		// 	}
		// });

		$("#wordnik-image-button").on("click", function(e) {
			e.stopPropagation();
			if ($("#wordnik-images").is(":empty")) {
				getImages(currentQuery);
			} else {
				$("#wordnik-images").slideUp('fast', function() {
					$("#wordnik-images").empty();
				});
			}
		});
	}



	function toggleDefinitions(leftOffset) {

		if (leftOffset > $("#wordnik-definitions").width() / 2) {
			definitionIndex++;
			definitionIndex = (definitionIndex >= definitionsArr.length) ? 0 : definitionIndex;
		} else {
			definitionIndex--;
			definitionIndex = (definitionIndex < 0) ? definitionsArr.length -1 : definitionIndex;
		}
		showDefinitionsSection();
	}



	function getImages(q) {

		$.ajax({
			url: 'https://www.google.si/search?q=' + q + '&hl=en&site=webhp&source=lnms&tbm=isch&tbs=itp:photo',
			statusCode: {
				404: function() {}
			}
		})
		.done(function(data) {
			imagesArr = data.match(/data-src="(.*?)"/g).map(function(item) {
				return item.replace(/"/g, "").replace(/data-src=/g, "");
			});
			showImagesSection();
		})
		.fail(function() {});
	}

	function showImagesSection() {

		if ($("#wordnik-images").is(":empty")) 
			$("#wordnik-images").show();
		
		$('<img src="' + imagesArr[imageIndex] + '">').load(function() {
			$(this).appendTo('#wordnik-images');
			$("#wordnik-images").css("height", "auto");
		});



	}

	function toggleImages(leftOffset) {

		if (leftOffset > $("#wordnik-images").width() / 2) {
			imageIndex++;
			imageIndex = (imageIndex >= imagesArr.length) ? 0 : imageIndex;
		} else {
			imageIndex--;
			imageIndex = (imageIndex < 0) ? imagesArr.length -1 : imageIndex;
		}
		
		$("#wordnik-images").css("height", $("#wordnik-images").css("height"));
		$('#wordnik-images').empty();
		showImagesSection();
	}



	function getWordFromEditor() {
		if (m._editor.somethingSelected()) {
			var q = m._editor.getSelection();
		} else {
			var w = m._editor.findWordAt(m._editor.getCursor());
			var q = m._editor.getRange(w.from(), w.to());
			m._editor.setSelection(w.from(), w.to());
		}
		return q;
	}

	
	function setBlankPlaceholder() {
		$("#wordnik-main-container").append('<div id="wordnik-blank-placeholder">Select a word, then click<br><br><span style="font-family: Font Awesome">&#xf01e;</span><br><br>button below or hit<br><br><strong>CTRL+ALT+T</strong><br><br>to get synonyms and definitions.</div>');
	}



	return {
		_init: _init,
		lookupWord: lookupWord
	};
};