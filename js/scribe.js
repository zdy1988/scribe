/**
 * Created by hz on 2015/1/15.
 */
(function ($,win) {
    var Class = {
        create: function () {
            return function () { this.Initialize.apply(this, arguments); }
        }
    }
    var Extend = function (destination, source) {
        for (var property in source) {
            destination[property] = source[property];
        }
    }
    var scribe = Class.create();
    scribe.prototype = {
        Initialize: function (id, options) {
            this.SetOption(options);
            this.index = this.options.index || 0;//current check table tr index
            this.maxIndex = 0;//current check table maxindex
            this.symbol = /[（“”）：「」；,，、．〔〕.。?!()（）“”‘’：「」；,，、．〔〕.。+（）？“”‘’【】！-]/g;//auto symbol reg
            this.realWords = [];//cache current check real word
            this.realText = '';//cache current check real text
            this.currentTimer = 0;//current timer
            this.countdown = undefined;//cache current countdown
            this.tipCount = 0;//carrent tip number
            this.$currentTable = $('#' + id);
            if (this.$currentTable != undefined && this.$currentTable.length > 0) {
                this.maxIndex = this.$currentTable.find('tr').length;
                //初始化表格
                this.InitTable();
                //初始化难度
                this.InitDiff();
                //初始化词语
                this.InitWord();
                //初始化输入框
                this.InitInput();
                //转到设置的索引
                this.TurnToIndex();
            }else{
                throw new Error('table is not defined');
            }
        },
        Dispose: function (entity) {
            entity = null;
            delete entity;
        },
        SetOption: function (options) {
            this.options = {
                index: 0,//起始条目索引
                level: 1,//设置难度
                fillInData: [],//如果难度为填空，把需要填空的数据load进来
                timer: 60,//如果难度为默写，设置倒计时
                maskUrl:"image/jb2.png",
                autoSymbol:true,
                tipLimit: 3,//设置可提示最大次数
                enterEndCallback: function () {

                },//输入完毕的时候回调
                enterItemEndCallback:function(){

                },//输入一条完毕的时候回调
                enterListEndCallback:function(){

                },//输入整个列表完毕的时候回调
                timerCallback: function () {

                },//如果难度为默写，前台需要显示倒计时，设置回调函数，目前返回倒计时
                timerOver: function () {
                    
                }//倒计时完毕回调
            };
            Extend(this.options, options || {});
        },
        TurnToIndex: function () {
            if(this.index>0)
            {
                var self = this;
                this.$currentTable.find('tr').each(function (i,d) {
                    if(i<self.index) {
                        var $td = $(this).find('td').last();
                        var $font = $td.find('font');
                        $font.css('background-color', '#FAF9DE');
                        $font.css('color', '#006633');
                        var $data = $td.data('text');
                        $td.html($font.html($data));
                    }
                })
            }
        },
        InitTable: function () {
            $(document).keydown(function (e) {
                if(e.ctrlKey && e.keyCode==65)
                {
                    return false;
                }
                if(e.ctrlKey && e.keyCode==67)
                {
                    return false;
                }
                if(e.ctrlKey && e.keyCode==86)
                {
                    return false;
                }
            });
            this.$currentTable.bind("copy cut paste contextmenu selectstart dragstart beforecopy", function (e) {
                return false;
            });
        },
        InitDiff: function () {
            this.defaultSymbol  = '○';
            var self = this;
            this.$currentTable.find('tr').each(function (i, d) {
                var $currentTd = $(d).find('td').last();
                //初始化难度之前把当前字符取出，存储在td上
                $currentTd.data('text', $currentTd.text());
                var fillInDataItem = undefined;
                if(self.options.fillInData!=undefined) {
                    $(self.options.fillInData).each(function () {
                        if (i+1 == this.index) {
                            fillInDataItem = this;
                        }
                    });
                }
                self.SetDiff($currentTd, fillInDataItem);
            });
        },
        SetDiff: function (td,fillInDataItem) {
            if (arguments.length > 0) {
                var $currentTd = td;
                var $text = $currentTd.find('font').text();
                switch (this.options.level) {
                    case diffLevel.none:
                        break;
                    case diffLevel.fade:
                        $currentTd.css('position', 'relative');
                        if(this.$currentTable.is(':hidden'))
                        {
                            this.$currentTable.show();
                        }
                        var $height = $currentTd.outerHeight() - parseInt($currentTd.css('borderTopWidth')) * 2;
                        var $width = $currentTd.find('font').width() + 5;
                        this.$currentTable.hide();
                        var $mask = $('<img class="mask" style="position:absolute;top:0;left: 5px; z-index: 1;" src="' + this.options.maskUrl + '"/>');
                        $mask.css('height', $height);
                        $mask.css('width', $width);
                        $mask.bind("mousedown selectstart", function () {
                            return false;
                        });
                        $currentTd.append($mask);
                        break;
                    case diffLevel.fill:
                        if (fillInDataItem) {
                            if (fillInDataItem.data.length > 0) {
                                var arr = fillInDataItem.data.split(',');
                                var self = this;
                                $(arr).each(function (i,d) {
                                    if (d != undefined && d.length > 0) {
                                        var str = '';
                                        for (var j = 0; j < d.length; j++) {
                                            str += self.defaultSymbol;
                                        }
                                        var reg=new RegExp(d,"g");
                                        $text = $text.replace(reg, str);
                                    }
                                });
                                $currentTd.find('font').html($text);
                            }
                        }
                        break;
                    case  diffLevel.dictation:
                        var str = '';
                        for (var i = 0; i < $text.length; i++) {
                            str += '　';
                        }
                        $currentTd.find('font').html(str);
                        this.ResetCountDown();
                        if(this.countdown==undefined) {
                            var self = this;
                            this.countdown = setInterval(function () {
                                if(self.runTimer!=undefined&&self.runTimer)
                                {
                                    self.currentTimer--;
                                    self.options.timerCallback(self.currentTimer);
                                    if(self.currentTimer == 0)
                                    {
                                        self.ClearCountDown();
                                        self.SuspendCountDown();
                                        self.options.timerOver();
                                    }
                                }
                            }, 1000);
                        }

                        break;
                    default :
                        break;
                }
            }
        },
        StartCountDown: function () {
            this.runTimer = true;
        },
        SuspendCountDown: function () {
            this.runTimer = false;
        },
        ResetCountDown: function () {
            this.currentTimer = this.options.timer;
        },
        ClearCountDown : function () {
            if (this.countdown != undefined) {
                win.clearInterval(this.countdown);
            }
        },
        InitWord: function () {
            this.$currentTd = this.$currentTable.find('tr').eq(this.index).find('td').last();
            this.$currentTd.parent().css('font-size', '20px');
            var text = this.$currentTd.text();
            if (typeof text == 'string') {
                this.realText = this.$currentTd.data('text');
                this.realWords = this.realText.match(/./g);
                var showWords = text.match(/./g);
                var $mark = '';
                if(this.$currentTd.find('img[class="mask"]').length>0)
                {
                    $mark = this.$currentTd.find('img[class="mask"]');
                }
                this.$currentTd.html('');
                var self = this;
                var $width = this.$currentTd.parent().css('font-size');
                $(showWords).each(function (i,d) {
                    self.$currentTd.append($('<span style="display: inline-block; z-index: 0;position: relative;"></span>').width($width).html(d));
                });
                this.$currentTd.append($mark);
            } else {
                throw new Error('text error!');
            }
        },
        InitInput: function () {
            var self = this;
            if(this.$input!=undefined)
            {
                this.$input.remove();
            }
            this.$input = $("<textarea class='txtinput' style='word-wrap:break-word;font-size: 20px;width:100%;height:50px;'></textarea>");
            this.$input.attr('maxlength',this.realWords.length);
            this.$input.focus(function () {
                if(self.enterStartTime==undefined)
                {
                    self.enterStartTime = new Date();
                }
            });
            var $inputContainer = $('<tr><td></td><td></td></tr>');
            var $prevTr = this.$currentTable.find('tr').eq(this.index);
            $prevTr.after($inputContainer);
            this.$input.height(100);
            $inputContainer.find('td').last().html(this.$input);
            this.$input.focus();
            this.$input.keyup(function (e) {
                var results = self.CheckWord(e.currentTarget);
                self.AutoSymbol(e.currentTarget);
                if(results)
                {
                    self.AutoNext(e.currentTarget);
                }
            });
            this.$input.keypress(function (e) {
                if (e.which == 13) { return false; }
            });
            //自动移动到input
            var $top = this.$input.offset().top - $(window).height() / 2 + 200;
            $("html,body").animate({ scrollTop: $top }, 1000);
            //修复如果第一个字符是标点的话
            this.AutoSymbol(this.$input);
        },
        CheckWord: function (target) {
            var $element = $(target);
            var text = $element.val();
            var words2 = text.match(/./g);
            var results = true;
            if(this.$currentSpans==undefined)
            {
                this.$currentSpans =  $element.parent().parent().prev().find('td').last().find('span');
            }
            var $spans = this.$currentSpans;
            $(this.realWords).each(function (i,d) {
                var $span = $spans.eq(i);
                if(words2!=undefined&&words2[i]!=''&&words2[i]!=undefined)
                {
                    if(words2[i]==d)
                    {
                        $span.text(d);
                        $span.css('background-color', '#5EB95E ');
                        $span.css('color', 'white');
                        $span.css('z-index','2');
                    }else{
                        $span.css('background-color', '#DD514C');
                        $span.css('color', 'white');
                        $span.css('z-index','2');
                        results = false;
                    }
                }else{
                    $span.css('background-color', '#FAF9DE');
                    $span.css('color', 'black');
                    $span.css('z-index','0');
                }
            });
            return results;
        },
        AutoSymbol: function (target) {
            if(!this.options.autoSymbol)
            {
                return;
            }
            var $element = $(target);
            if(this.$currentSpans==undefined)
            {
                this.$currentSpans =  $element.parent().parent().prev().find('td').last().find('span');
            }
            var $spans = this.$currentSpans;
            var isNoError = true;
            $($spans).each(function () {
                if ($(this).css('backgroundColor') == 'rgb(221, 81, 76)')
                {
                    isNoError = false;
                }
            });
            var text = $element.val();
            var nextWord = $(this.realWords).eq(text.length)[0];
            if(nextWord!=undefined&&nextWord.length>0&&isNoError)
            {
                if(nextWord.match(this.symbol)!=null)
                {
                    var text = $element.val();
                    $element.val(text+nextWord);
                    this.AutoSymbol(target);
                    this.CheckWord(target);
                }
            }
        },
        AutoNext: function (target) {
            var $element = $(target);
            var text = $element.val();
            if(this.$currentSpans==undefined)
            {
                this.$currentSpans =  $element.parent().parent().prev().find('td').last().find('span');
            }
            var $spans = this.$currentSpans;
            if (text === this.realText) {
                this.$currentTd.parent().css('font-size', '18px');
                $spans.each(function () {
                    $(this).css('background-color', '#FAF9DE');
                    $(this).css('color', '#006633');
                    $(this).css('z-index', '2');
                    $(this).width(18);
                });
                $element.parent().parent().remove();
                //将span缓存清空
                this.$currentSpans = undefined;
                //回调输入完毕,包括索引、开始时间、结束时间、时间差、字数
                this.enterEndTime = new Date();
                var diffEnterTime = this.enterStartTime.DateDiff('s',this.enterEndTime);
                this.options.enterEndCallback(this.index,this.enterStartTime,this.enterEndTime,diffEnterTime,this.realText.length);
                this.enterStartTime = undefined;
                this.enterEndTime = undefined;
                //将索引移动到下一条
                this.index += 1;
                //关闭倒计时
                this.ClearCountDown();
                if (this.maxIndex >= this.index + 1) {
                    this.options.enterItemEndCallback();
                    this.InitWord();
                    this.InitInput();
                } else {
                    this.options.enterListEndCallback();
                }
            }
        },
        TipWord: function () {
            this.ClearTip();
            this.tipCount++;
            if(this.tipCount>this.options.tipLimit) {
                return false;
            }
            this.$currentTd.css('position','relative');
            var $div = $("<div class='tip' style='position: absolute; top: 0;left: 0;z-index: 999;margin:10px 0px; background-color: rgb(250, 249, 222);'></div>");
            $div.height(this.$currentTd.height());
            $div.width(this.$currentTd.outerWidth()-this.$currentTd.css("padding-left")*2-this.$currentTd.css("margin-left")*2);
            $div.css("padding-left",this.$currentTd.css("padding-left"));
            $div.css("margin-left",this.$currentTd.css("margin-left"));
            $div.html(this.realText);
            this.$currentTd.append($div);

            $div.fadeIn(1000, function () {
                setTimeout(function () {
                    $div.fadeOut(1000, function () {
                        $div.remove();
                    })
                }, 1000);
            });
            return true;
        },
        ClearTip: function () {
            $('.tip').each(function () {
                $(this).remove();
            })
        }
    };
    win.diffLevel = {
        none : 1,
        fade: 2,
        fill: 3,
        dictation:4
    };
    win.scribe = scribe;
})($,window);

Date.prototype.Format = function(formatStr)  {  var str = formatStr;  var Week = ['日','一','二','三','四','五','六'];  str=str.replace(/yyyy|YYYY/,this.getFullYear());  str=str.replace(/yy|YY/,(this.getYear() % 100)>9?(this.getYear() % 100).toString():'0' + (this.getYear() % 100));  str=str.replace(/MM/,this.getMonth()>9?this.getMonth().toString():'0' + this.getMonth());  str=str.replace(/M/g,this.getMonth());  str=str.replace(/w|W/g,Week[this.getDay()]);  str=str.replace(/dd|DD/,this.getDate()>9?this.getDate().toString():'0' + this.getDate());  str=str.replace(/d|D/g,this.getDate());  str=str.replace(/hh|HH/,this.getHours()>9?this.getHours().toString():'0' + this.getHours());  str=str.replace(/h|H/g,this.getHours());  str=str.replace(/mm/,this.getMinutes()>9?this.getMinutes().toString():'0' + this.getMinutes());  str=str.replace(/m/g,this.getMinutes());  str=str.replace(/ss|SS/,this.getSeconds()>9?this.getSeconds().toString():'0' + this.getSeconds());  str=str.replace(/s|S/g,this.getSeconds());  return str;  };
Date.prototype.DateDiff = function(strInterval, dtEnd) {  var dtStart = this;  if (typeof dtEnd == 'string' )  {  dtEnd = StringToDate(dtEnd);  }  switch (strInterval) {  case 's' :return parseInt((dtEnd - dtStart) / 1000);  case 'n' :return parseInt((dtEnd - dtStart) / 60000);  case 'h' :return parseInt((dtEnd - dtStart) / 3600000);  case 'd' :return parseInt((dtEnd - dtStart) / 86400000);  case 'w' :return parseInt((dtEnd - dtStart) / (86400000 * 7));  case 'm' :return (dtEnd.getMonth()+1)+((dtEnd.getFullYear()-dtStart.getFullYear())*12) - (dtStart.getMonth()+1);  case 'y' :return dtEnd.getFullYear() - dtStart.getFullYear();  }  };