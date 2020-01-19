module.exports = function(api, pluginInfo) {


	var options = pluginInfo.options;
	var $ = api.window.$;
	var m = window;

	function _init() {
		setPane();
		setSections();
	}

	function setPane() {
		m.universalPane.registerPane("wm-statistics", "Word frequencies", {
			width: 300
		});
		$("#wm-statistics").append('<div id="statistics-main-container"></div>');
		$("#wm-statistics").append('<div id="statistics-reload"></div>');
		$("#statistics-reload").append('<span id="statistics-reload-button" class="awf">&#xf01e;</span>');
		if (m.os.platform() != 'darwin') $('#statistics-main-container').perfectScrollbar();

		$("#statistics-reload-button").on("click", function(e) {
			setWordFrequencies();
		});



	}

	function setSections() {
		addSection("word frequencies", "", true);
	}

	function addSection(name, contentHtml, isExpanded) {
		var safeName = name.replace(/\s+/g, "-");
		$('#statistics-main-container').append('<div id="statistics-' + safeName + '" class="statistics-section">  <div class="statistics-section-header">' + name.toUpperCase() + '</div><div class="statistics-section-content">' + contentHtml + '</div></div>');
		$('#statistics-' + safeName).jqxExpander({ width: '100%', showArrow: false, expanded: isExpanded });
	}

	function setWordFrequencies() {
		
		var frq = m.stats.getUniqueWords(m._editor.somethingSelected() ? m._editor.getSelection() : m._editor.getValue(), {excludeStopWords: true, minFreq: 1});

		var html = '<table class="statistics-table">';
		
		for (var i = 0; i < frq.length; i++) {
			
			var cla = "";
			if (frq[i].syllables >= 4) {
				cla = "table-bold";
			}
			if (frq[i].stopWord) {
				cla += " table-fade";
			}

			// positions bar
			var barHtml = '<div style="width: calc(100% - 2px); height: .4rem; border: 1px solid gray; border-radius: 3px;">';

			var positionsMarked = [];
			for (var j = 1; j < frq[i].positions.length; j++) {

				var posInPercent = m.mapNumberToRange(frq[i].positions[j], [0, frq[i].positions[0]], [1, 100]);
				
				if (positionsMarked.indexOf(posInPercent) < 0) {
					positionsMarked.push(posInPercent);
					barHtml += '<div style="position: relative; display: inline-block; top: -.35rem; width: 1px; height: .25rem; left: ' + posInPercent + '%; margin-right: -1px; background: ' + m.localStorage["VIEWPORT_MARK_COLOR"] + ';"></div>';
				}
			}
			
			barHtml += '</div>';
			
			html += '<tr style="height: 1.2em;" class="' + cla + '"><td class="frq-word-click">' + frq[i].label.toUpperCase() + '</td><td style="font-size:.75em; text-align: right;">'  + frq[i].count + '</td><td style="width: 45%;">'  + barHtml + '</td></tr>';
		}
		html += "</table>";

		// set cloud
		var kw = m.stats.getKeyWords("", {}, frq);
		var cloudHtml = '<div id="statistics-word-cloud" style="overflow: hidden!important; width: 90%; margin: auto; align-content: center; height: 17rem; margin-bottom: .5rem;"></div>';

		var k = 0;
		var cloudData = kw.map(function(item) {
			k++;
			return {
				word: item.label.toUpperCase(),
				weight: item.index,
				color: k <= 8 ? m.localStorage["VIEWPORT_MARK_COLOR"] : m.localStorage["VIEWPORT_TEXT_COLOR"]
			}
		});
		// end cloud


		// inject html
		$('#statistics-word-frequencies').jqxExpander("setContent", cloudHtml + html);

		// set cloud
		$("#statistics-word-cloud").jQWCloud({
			// title: 'Test',
			words: cloudData,
			minFont: 8,
			maxFont: 35,
			fontOffset: 5,
			showSpaceDIV: false,
			spaceDIVColor: 'transparent',
			verticalEnabled: true,
			cloud_color: null,
			cloud_font_family: "Impact, Arial Black, Futura, Helvetica, sans-serif",
			padding_left: 3,
			word_common_classes: "wordCloudWord",
			word_click: function(e) {
				var event = e || window.event;
				event.stopPropagation ? event.stopPropagation() : (event.cancelBubble = true);
				m._editor.removeMatches();
				m._editor.showMatches($(this).text().toLowerCase())
			},
			word_mouseOver: function() {},
			word_mouseEnter: function() {},
			word_mouseOut: function() {},
			beforeCloudRender: function() {},
			afterCloudRender: function() {}
		});


		$(".frq-word-click").on("click", function(e) {
			m._editor.removeMatches();
			m._editor.showMatches( $(this).text().toLowerCase() );
		});

		$("#statistics-word-cloud").on("click", function (e) {
			m._editor.removeMatches();
		});
	}


	return {
		_init: _init
	};
};