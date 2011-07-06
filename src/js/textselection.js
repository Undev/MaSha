jQuery.TextSelector = function(options) {
        
    var defaults = {
        regexp: /[^\s,;:«»–.!?<>…\n]+/ig,
        hashStart: 'sel=',
        selectorSelectable: '#selectable-content',
        selectorMarker: '#txtselect_marker',
        ellipsisText: "..."
    };
    
    var options = $.extend(defaults, options);
    
    jQuery.TextSelector.options = options;
    
    //get text nodes in element function (old)
    var getTextNodesIn = (function() {
        function textNodeFilter() {
            return (this.nodeType == 3 && this.nodeValue.length > 0 && (options.regexp.test(this.nodeValue)));
        }

        return function(el) {
            var $el = $(el);
            return $el
                .contents()
                .filter(textNodeFilter)
                .add(
                    $el.find("*")
                       .contents()
                       .filter(textNodeFilter)
                );
        };
    })();

    $.fn.textNodes = function() {
        var ret = [];
        this.contents().each( function() {
            var fn = arguments.callee;
            if ( this.nodeType == 3 && $.trim(this.nodeValue) != '') 
                ret.push( this );
            else $(this).contents().each(fn);
        });
        return $(ret);
    }

    $.fn.cleanWhitespace = function() {
        textNodes = this.contents()
                        .filter(
                            function() { 
                                return (this.nodeType == 3 && !/\S/.test(this.nodeValue)); 
                            }
                        ).remove();
    }
    
    $.fn.hasAttr = function(name) {  
        return this.attr(name) !== undefined;
    };

    function _siblingNode(cont, prevnext, firstlast, offs){
        console.log('getting', prevnext, cont);
        while (cont.parentNode && $(cont).parents(options.selectorSelectable).length){
            while (cont[prevnext + 'Sibling']){
                cont = cont[prevnext + 'Sibling'];
                while (cont.nodeType == 1 && cont.childNodes.length){
                    cont = cont[firstlast + 'Child'];
                }
                if (cont.nodeType == 3 && cont.data.match(options.regexp) != null){
                    console.log('getting ' + prevnext +  ': _container:', cont.data,
                                '_offset:', offs * cont.data.length);
                    return {_container: cont, _offset: offs * cont.data.length};
                }
            }
            cont = cont.parentNode;
        }
    }

    function prevNode(cont){
        return _siblingNode(cont, 'previous', 'last', 1);
    }
    function nextNode(cont){
        return _siblingNode(cont, 'next', 'first', 0);
    }

    // init base var
    var addSelection, removeSelection1, removeSelection2, logger_count = 0;


    // init counting symbols/word functions
    $.TextSelector._len = {
        words: function(_container, _offset, pos){
            console.log('countingWord: ––––––––––––––––––––––––––––––––––––––––––––––––');
            console.log('countingWord: подсчет слов. аргументы: _container =', _container, '; _offset = ', _offset);
            
            
            
            function wordCount(node) {
                var _wcount = 0;
                //console.log('countingWord.wordCount: в wordCount func. node = ', node, '; nodeType = ', node.nodeType);
                if (node.nodeType == 3) { // Text only
                    var match = node.nodeValue.match(options.regexp);
                    if (match) { _wcount += match.length; }
                    //console.log('countingWord.wordCount: эта нода', node, 'текстовая. Слов в ноде: '+ _wcount);
                } else if (node.childNodes && node.childNodes.length){ // Child element
                    var alltxtNodes = getTextNodesIn(node);
                    //console.log('countingWord.wordCount: рассматриваемая нода имеет '+alltxtNodes.length+' чайлд(ов)');
                    //console.log('alltxtNodes: ', alltxtNodes);
                    for (i=0; i<alltxtNodes.length; i++) {
                        console.log('countingWord.wordCount: Шаг №', i, '. Считаем кол-во слов в ноде', alltxtNodes[i], '. Слов = ', alltxtNodes[i].nodeValue.match(options.regexp).length);
                        _wcount += alltxtNodes[i].nodeValue.match(options.regexp).length;
                        console.log('_wcount = ', _wcount);
                    }
                }
                console.log('countingWord.wordCount: возвращаю _wcount = ', _wcount);
                return _wcount;
            }
        
        
            if (_container.nodeType == 1) {
                _container = getTextNodesIn(_container)[0];
            }
            // вычитаем из start/end Container кусок текста, который входит в выделенное. Оставшееся разбиваем регекспом, и считаем кол-во слов.
            var wcount = _container.data.substring(0, _offset).match(options.regexp);
            
            console.log('wcount', wcount);
            if (wcount != null) { 
                if (pos=='start') wcount = wcount.length+1; 
                if (pos=='end') wcount = wcount.length;
            } else { 
                wcount = 1;
            }
            console.log('countingWord: в '+pos+'Container ноде до начала выделения слов:', wcount);

            var node = _container;
            var all_nodes = [];
            while(node && !node.selection_index){
                node = prevNode(node)._container;
                all_nodes.push(node);
                //node = node? node._container: null;
            }
            var selection_index = node.selection_index;

            for (var i=all_nodes.length; i--;) {
                var onei_ = wordCount(all_nodes[i]);
                wcount += onei_;
                console.log('countingWord: подсчитываем слова в ноде ', all_nodes[i], '. Слов ', onei_);
            }
            
            /*
            n = _container.previousSibling;
            // FIXME! Требуется подсчет кол-ва слов и за пределами внутренних <b></b>
            while (n) {
                if (pos=='end') {
                    console.log('countingWord: подсчитываем слова в одной из предыдущих от '+pos+'Container ноде[n] = ', n);
                } else {
                    console.log('countingWord: подсчитываем слова в '+pos+'Container ноде[n] = ', n);
                }
                var onei = wordCount(n);
                wcount += onei;
                console.log('countingWord: в ноде ', n, ' подсчитано ', onei, 'слов. Теперь в общей копилке ', wcount, 'слов');
                n = n.previousSibling;
            }
            */
            //console.log('countingWord: итог работы (кол-во слов до первого/последнего слова)', wcount);
            //console.log('countingWord: ––––––––––––––––––––––––––––––––––––––––––––––––');
            return selection_index + ':' + wcount;
        },
        symbols: function(_node){
            var _count = 0;
            if (_node.nodeType == 3) {
                _count = _node.nodeValue.length;
            } else if (_node.childNodes && _node.childNodes.length) {
                var allnodes = $(_node).textNodes();
                for (var i = allnodes.length; i--; ) {
                    _count += allnodes[i].nodeValue.length;
                }
            }
            return _count;
        }
    }

    // init main object
    $.TextSelector._sel = {
        count: 0,
        savedSel: [],
        ranges: {},
        rootNode: 'selectable-content',
        aftercheck: [],
        childs: [],
        updateHash: function(_delete){
            _delete = _delete || false;
            var hash = '';
            var nowhash = location.hash;
            
            
            if (_delete) {
                nowhash = nowhash.replace(_delete+';', '');
                location.hash = nowhash;
            } else {
                for (key in $.TextSelector._sel.ranges) { 
                    if (nowhash.indexOf($.TextSelector._sel.ranges[key]) == -1) {
                        hash += $.TextSelector._sel.ranges[key] + ';';
                    }
                }
                if (nowhash.indexOf('sel=') == -1) {
                    nowhash = options.hashStart;
                    nowhash = nowhash+hash;
                } else {
                    nowhash = nowhash+hash;
                }
                location.hash = nowhash;
            }
            console.log('updateHash: обновляем хэш: ', hash);
        },

        readHash: function(){
            console.log('readHash: ––––––––––––––––––––––––––––––');

            var hash = location.hash;
            if (!hash) return;
        
            hash = hash.split('#')[1];

            if(! /sel\=(?:\d+\:\d+\,\d+\:\d+;)*\d+\:\d+\,\d+\:\d+/.test(hash)) return;

            hash = hash.substring(4, hash.length);
        
            hashAr = hash.split(';');
            console.log('readHash: из хэша получен массив меток выделений: ', hashAr);
            // восстанавливаем первое выделение + скроллим до него.
        
            for (var i=0; i < hashAr.length-1; i++) {
                console.log('readHash: восстанавливаем метку [запускаем $.TextSelector._sel.restoreStamp('+hashAr[i]+');]');
                $.TextSelector._sel.restoreStamp(hashAr[i]);
            }

            // Вычисляем кол-во px от верха до первого выделенного участка текста, далее - скроллим до этого места.
            var scrollTo = $('.user_selection_true:first').offset().top - 150;
            $('html,body').animate({
                scrollTop:scrollTo
                }, 1500,  "easeInOutQuint");

            console.log('readHash: ––––––––––––––––––––––––––––––');

        },

        restoreStamp: function(stamp){
            //console.log('$.TextSelector._sel.restoreStamp: ––––––––––––––––––––––––––––––');
            //console.log('$.TextSelector._sel.restoreStamp: запускаем rangy.deserializeSelection('+stamp+')');
            var range = $.TextSelector._sel.deserializeSelection(stamp);
            //console.log('$.TextSelector._sel.restoreStamp: запускаем $.TextSelector._sel.tSelection(false)');
            if(range){
                $.TextSelector._sel.addSelection(false, range);
                $.TextSelector._sel.count++;
            }
            //console.log('$.TextSelector._sel.restoreStamp: ––––––––––––––––––––––––––––––');
        },
        deserializeSelection: function(serialized) {
            
            var rootNode = document.getElementById($.TextSelector._sel.rootNode);
            //console.log('deserializeSelection', rootNode);

            var sel = window.getSelection();
            console.log('deserializeSelection: sel=', sel)
            var ranges = [];
            if(sel.rangeCount > 0) sel.removeAllRanges();

            var range = deserializeRange(serialized, rootNode, document)
            if (range) {
                sel.addRange(range);
                return sel;
            } else {
                return null;
            }
            
            function deserializePosition(serialized, rootNode, doc, pos){
                 var bits = serialized.split(":");
                 var node = $.TextSelector._sel.blocks[parseInt(bits[0])];

                 var pos_text;

                 //console.log('deserializePosition: Осуществляем подсчет '+pos+'-овой позиции');
                 console.log('deserializePosition: выбран элемент = ', node, bits[0]);
                 //console.log('deserializePosition: в выбранном элементе '+$(el).contents().length+' childNodes');


                 var offset, stepCount = 0, exit = false;
                 //console.log('deserializePosition: ищем по счету '+bits[1]+' слово. Запускаем цикл перебора всех слов родительского элемента.');
                 while (node) {
                     var re = new RegExp ('[^\\s,;:«»–.!?]+', 'ig');
                     while ((myArray = re.exec(node.data )) != null) {
                         stepCount++;
                         //console.log('deserializePosition: слово №'+stepCount+' = "', myArray[0], '"; (startoffset =', myArray.index, ', endoffset =', re.lastIndex, ')');
                         if (stepCount == bits[1]) {
                             if (pos=='start') offset = myArray.index;
                             if (pos=='end') offset = re.lastIndex;

                             return {node: node, offset: parseInt(offset, 10)};
                             //console.log('deserializePosition: '+pos+'овое слово найдено = ', myArray[0], '. Целевая нода = ', _allnodes[i], '. Символьный offset = ', offset);
                             //node = _allnodes[i];
                             break;
                         } else {
                             //console.log('пустой проход.', stepCount, '|', bits[1]);
                         }

                     }
                     node = nextNode(node)
                     node = node? node._container: null;
                     if (node.selection_index){
                         node = null;
                     }
                 }
                 return {node: null, offset: 0};
            }
            function deserializeRange(serialized, rootNode, doc){
                rootNode = rootNode || document.getElementById($.TextSelector._sel.rootNode);
                if (rootNode) {
                    doc = doc || document;
                } else {
                    doc = doc || document;
                    rootNode = doc.documentElement;
                }
                var result = /^([^,]+),([^,]+)({([^}]+)})?$/.exec(serialized);

                var start = deserializePosition(result[1], rootNode, doc, 'start'), end = deserializePosition(result[2], rootNode, doc, 'end');

                if (start.node && end.node){
                    var range = document.createRange();
                    range.setStart(start.node, start.offset);
                    range.setEnd(end.node, end.offset);
                    return range;
                } else {
                    if (window.console){console.warn('Cannot deserialize range', serialized);}
                    return null;  
                }
            }

        },

        serializeSelection: function(selection, rootNode) {
            var rootNode = document.getElementById($.TextSelector._sel.rootNode);
            
            console.log('serializeSelection: selection = ', selection);

            selection = selection || window.getSelection();
            
            var range = $.TextSelector._sel.aftercheck;
            
            return serializeWord(range.startContainer, range, 'start', rootNode) + "," +
                   serializeWord(range.endContainer, range, 'end', rootNode);

            function serializeWord(node, range, piu, rootNode) {

                offset = 0;
                var pathBits = [], n = node;
                var nodeNum;

                if ($(node).hasAttr('nodeNum')) {
                    nodeNum = $(node).attr('nodeNum');
                } else if ($(node).parents('.nodeNum:first').hasAttr('nodeNum')){
                    nodeNum = $(node).parents('.nodeNum:first').attr('nodeNum');
                }

                if (piu=='start'){
                    return $.TextSelector._len.words(range.startContainer, range.startOffset, piu);
                } else {
                    return $.TextSelector._len.words(range.endContainer, range.endOffset, piu);
                }
                return ;
            }
        },

        checkSelection: function(range) {
            /*
             * Corrects selection.
             * Returns checker object
             */
            console.log('checkSelection: ––––––––––––––––––––––––––––––');
            console.log('checkSelection: получен аргумент range = ', range);
            range = $.TextSelector._sel.getFirstRange();
            console.log('checkSelection: range = ', range.endOffset, range.endContainer);
            var checker = range,
                startDone = false, endDone = false;
            
        
            var newStartOffset = kernel(checker.startOffset, checker.startContainer, 'start');
            var newEndOffset = kernel(checker.endOffset, checker.endContainer, 'end');
            
        
            checker.setStart(checker.startContainer, newStartOffset);
            checker.setEnd(checker.endContainer, newEndOffset);
            console.log('checkSelection: checker = ', checker);
        
            console.log('checkSelection: ––––––––––––––––––––––––––––––');
        
            $.TextSelector._sel.aftercheck = checker;
        
            return checker;

            function kernel(offset, container, position) {
                
                function is_word(str){
                    return str.match(options.regexp) != null;
                }

                function is_not_word(str){
                    return str.match(options.regexp) == null;
                }

                function stepBack(container, offset, condition) {
                    var init_offset = offset;
                    //console.log('checkSelection.stepBack: offset: ', offset);
                    while (offset > 0 && condition(container.data[offset-1])){
                        //console.log('checkSelection.stepBack: корректируем offset шагом назад. '+ 
                        //            'Шаг #', init_offset - offset + 1, '; '+
                        //            'Проверяем символ "', container.data[offset - 1], '"');
                        offset--;
                    }
                    //console.log('checkSelection.stepBack: корректируем offset шагом назад. '+ 
                    //            'Шаг #', init_offset - offset + 1, '; '+
                    //            'Проверяем символ "', container.data[offset - 1], '"');
                    return offset;
                }
                
                function stepForward(container, offset, condition) {
                    var init_offset = offset;
                    //console.log('checkSelection.stepForward: offset: ', offset);
                    while (offset < container.data.length && condition(container.data[offset])){
                        //console.log('checkSelection.stepForward: корректируем offset шагом назад. '+ 
                        //            'Шаг #', offset - init_offset + 1, '; '+
                        //            'Проверяем символ "', container.data[offset], '"');
                        offset++;
                    }
                    //console.log('checkSelection.stepForward: корректируем offset шагом назад. '+ 
                    //            'Шаг #', offset - init_offset + 1, '; '+
                    //            'Проверяем символ "', container.data[offset], '"');
                    return offset;
                }


                
                if (position == 'start') {
                    
                    if (container.nodeType == 1 && $.trim($(container).text()) != '') {
                        console.log('в if-е.');
                        container = $(container).textNodes()[0];
                        checker.setStart(container, 0);
                        console.log('новый container', container);
                    }

                    if (container.nodeType != 3 ||
                        container.data.substring(offset).match(options.regexp) == null) {
                        console.log('in if nodeType=', container.nodeType);
                        var newdata = nextNode(container);
                        checker.setStart(newdata._container, newdata._offset);
                        container = newdata._container;
                        offset = newdata._offset;
                        console.log('offset', offset);
                    }

                    // Важно! Сначала сокращаем выделение, потом расширяем
                    offset = stepForward(container, offset, is_not_word);
                    console.log('checkSelection: скорректированный offset = ', offset);
                
                    offset = stepBack(container, offset, is_word);
                    console.log('checkSelection: скорректированный offset = ', offset);
                    
                    return offset;
                }
                
                if (position == 'end') {
                    
                    if (container.nodeType == 1 && $.trim($(container).text()) != '' && offset != 0) {
                        console.log('в end if-е.');
                        container_txtnodes = $(container).textNodes();
                        container = container_txtnodes[container_txtnodes.length-1];
                        offset = container.data.length;
                        checker.setEnd(container, container.data.length);
                        console.log('новый container', container, offset);
                    }
                    
                    if (container.nodeType != 3 ||
                        container.data.substring(0, offset).match(options.regexp) == null) {
                        var newdata = prevNode(container);
                        checker.setEnd(newdata._container, newdata._offset);
                        container = newdata._container;
                        offset = newdata._offset;
                        console.log('offset', offset);
                    }
                    
                    // Важно! Сначала сокращаем выделение, потом расширяем
                    offset = stepBack(container, offset, is_not_word);
                    console.log('checkSelection: скорректированный offset = ', offset);

                    offset = stepForward(container, offset, is_word);
                    console.log('checkSelection: скорректированный offset = ', offset);

                    return offset;
                }
            }
        },

        addSelection:function(hash, range) {
        
            range = range || false;
            
            console.log('addSelection func: hash',hash, 'range', range );
        
            range = $.TextSelector._sel.checkSelection(range);
            console.log('after checkSelection range = ', range);
            if (!hash){
                // генерируем и сохраняем якоря для выделенного
                $.TextSelector._sel.ranges['num'+$.TextSelector._sel.count] = $.TextSelector._sel.serializeSelection();
            }

            _range.addSelection('num'+$.TextSelector._sel.count+' user_selection_true', range);

            var timeout_hover, timeout_hover_b = false;
            var _this;

            function unhover() { 
                if (timeout_hover_b) $("."+_this.className.split(' ')[0]).removeClass("hover"); 
            }

            $(".num"+$.TextSelector._sel.count).mouseover(function(){
                _this = this;
                //console.log($(this), this.classList[1], $("."+this.classList[1]));
                $("."+this.className.split(' ')[0]).addClass('hover');
                timeout_hover_b = false;
                clearTimeout(timeout_hover);
            });

            $(".num"+$.TextSelector._sel.count).mouseleave(function(){
                timeout_hover_b = true;
                var timeout_hover = setTimeout(unhover, 2000);
            });

            $('.num'+$.TextSelector._sel.count+':last').append('<span class="closewrap"><a href="#" class="txtsel_close"></a></span>');
        
            hash = hash || true;
            if (hash) $.TextSelector._sel.updateHash();

            window.getSelection().removeAllRanges();
        },
        getFirstRange: function(){
            var sel = window.getSelection();
            var res = sel.rangeCount ? sel.getRangeAt(0) : null;
            console.log('getFirstRange func:', res);
            return res;
        },
        onlytSelection: function(obj){
            /* Здесь вызов функции оборачивалки (удаление выделения)
            obj.toggleSelection();
            */
        },
        enumerateElements: function(){
            // Returns first text node in each visual block element
            var node = $(options.selectorSelectable)[0];
            var captureCount=0;
            jQuery.TextSelector._sel.blocks={};

            enumerate(node);

            function enumerate(node){
                var children = node.childNodes;
                var has_blocks = false;
                var block_started = false;

                for (var idx=0, len=children.length; idx<len; ++idx) {
                    var child = children.item(idx);
                    var nodeType = child.nodeType;

                    if (nodeType==3 && !child.nodeValue.replace(/^\s+/, '').replace(/\s+$/, '')) {
                        // ..if it is a textnode that is logically empty, ignore it
                        continue;
                    } else if (nodeType==3) {
                        if (!block_started){
                            // remember the block
                            captureCount++;
                            $(child).attr('selection_index', captureCount);
                            child.selection_index = captureCount;
                            jQuery.TextSelector._sel.blocks[captureCount] = child;
                            has_blocks = block_started = true;
                        }
                    } else if (nodeType==1) {
                        // XXX check if this is correct
                        var is_block = getStyle(child, 'display') != 'inline';
                        if (is_block){
                            if (!is_ignored(child)){
                                var child_has_blocks = enumerate(child);
                                has_blocks = has_blocks && child_has_blocks;
                                block_started = false
                            }
                        } else if (!block_started) {
                            block_started = enumerate(child);
                            has_blocks = has_blocks && block_started;
                        }
                    }
                }
                return has_blocks;
            }
        }
    }

    function is_ignored(node){
        node = $(node);
        return (node.hasClass('inpost')
                || node.hasClass('b-multimedia')
                || node.hasClass('photo'));
    }

    function range_is_selectable(){
        // getNodes() это от rangy вроде.
        var node;
        var iterator = _range.getElementIterator($.TextSelector._sel.getFirstRange());
        while (node = iterator()){
            if (!$(node).parents(options.selectorSelectable).length
                || $(node).parents('.user_selection_true').length
                || $(node).parents('div.b-multimedia').length
                || $(node).parents('div.inpost').length) { 
                    return false; 
                } 
            if (node.nodeType == 1) {
                if ($(node).hasClass('user_selection_true') // XXX merge selections?
                    || is_ignored(node)) {
                     //alert('отказ');
                     //console.log('отказ! все из-за ', nodes[i]);
                     return false;
                 }
            }
        }
        return true;
    }



    $(function(){ // domready
        var selectable = $(options.selectorSelectable)
        var selectableMessage = new SelectMessage();

        if (!selectable.length) return;
    
        selectable.cleanWhitespace();
        selectable.find('*').cleanWhitespace();
    
        
        // нумерация блочных элементов, которые содержат текст
        $.TextSelector._sel.enumerateElements();
    
        var marker = $(options.selectorMarker);
        var dontshow = false;

        $(document).bind('textselect', function(e) {
            /*
             * Show the marker if any text selected
             */
            if (e.text == '' || !options.regexp.test(e.text)) return;
            if (!range_is_selectable()) return;
       
            window.setTimeout(function(){
                if (!dontshow) {
                    marker.css({'top':e.pageY-33, 'left': e.pageX+5});
                    if ($.browser.msie) {
                        marker.addClass('show');
                    } else {
                        marker.fadeIn('fast', function(){
                            marker.addClass('show');
                        });
                    }
                }
            }, 1);
        });
    
    
    
        marker.click(function(e){
            e.preventDefault();
            if (!range_is_selectable()){
                marker.removeClass('show').css('display', 'none');
                console.log('Range is not selectable')
                return;
            }
            
            dontshow = true;
        
            $.TextSelector._sel.addSelection();
            $.TextSelector._sel.count++;

            if ($.browser.msie) {
                onHideMarker()
            } else {
                marker.fadeOut('fast', onHideMarker);
            }
            function onHideMarker(){
                marker.removeClass('show');
                selectableMessage.show();
                dontshow = false;
            }
        });
    
        $('.closewrap a.txtsel_close').live('click', function(){
            var parent = this.parentNode.parentNode;
            var numclass = parent.className.split(' ')[0];
            $('.'+numclass).removeClass('hover');
            $(this).fadeOut('slow', function(){
                $(this).parent('span.closewrap').remove();
                removeTextSelection('.'+numclass+'.user_selection_true');
                $.TextSelector._sel.updateHash($.TextSelector._sel.ranges[numclass]);
                delete $.TextSelector._sel.ranges[numclass];
            });

            return false;
        });

        $(document).click(function(e){
            tar = $(e.target);
            if (tar.attr('id') != 'txtselect_marker') {
                dontrun = false;
                if($('#txtselect_marker').hasClass('show')){
                    if ($.browser.msie) {
                        $('#txtselect_marker').removeClass('show');
                    } else {
                        $('#txtselect_marker').fadeOut('fast', function(){
                            $(this).removeClass('show');
                        });
                    }
                }
            }
        });
    
        $.TextSelector._sel.readHash();
    });


    function SelectMessage() {
        var $msg = $('#upmsg-selectable');
        var autoclose;

        this.show = function(){
            if (get_closed()) return;
            //if ($msg.hasClass('show')) return;
        
            $msg.addClass('show');
        
            if ($.browser.msie) {
                $msg.animate({
                    'top': '0px'
                }, { duration: 1000, easing: 'easeOutQuint' });
            } else {
                $msg.animate({
                    'top': '0px',
                    'opacity': '1'
                }, { duration: 1000, easing: 'easeOutQuint' });
            }

            clearTimeout(autoclose);
            autoclose = setTimeout(closemsg, 10000);
        }
    
    
        $msg.find('.upmsg_closebtn').click(function(){
            closemsg();
            save_closed();
            clearTimeout(autoclose);
            return false;
        });

        function closemsg(){
            if ($.browser.msie) {
                $msg.animate({
                    'top': '-57px'
                }, 500,  "easeInQuint", function(){ 
                    $msg.removeClass('show');
                });
            } else {
                $msg.animate({
                    'top': '-57px',
                    'opacity': 0
                }, 500,  "easeInQuint", function(){ 
                    $msg.removeClass('show');
                });
            }
            return false;
        }
    
        function save_closed(){
            if (window.localStorage){
                localStorage.selectable_warning = 'true';
            } else {
                $.cookie('selectable-warning', 'true');
            }
        }
        function get_closed(){
            if (window.localStorage){
                return !!localStorage.selectable_warning;
            } else {
                return !!$.cookie('selectable-warning');
            }
        }
    }

};


function getStyle(oElm, strCssRule){
    // XXX check if it works in IE
    // Check if it is not implemented in jQuery
    // XXX move out from here
	var strValue = "";
	if(document.defaultView && document.defaultView.getComputedStyle){
		strValue = document.defaultView.getComputedStyle(oElm, "").getPropertyValue(strCssRule);
	}
	else if(oElm.currentStyle){
		strCssRule = strCssRule.replace(/\-(\w)/g, function (strMatch, p1){
			return p1.toUpperCase();
		});
		strValue = oElm.currentStyle[strCssRule];
	}
	return strValue;
}
