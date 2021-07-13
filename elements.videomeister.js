!((// in IIFE so nothing in the global scope, no export either
) => {
    let $ = (x, root = document) => root.getElementById(x);
    let createElement = (
        tag,
        content = {},
        inject = false
    ) => (
            tag = document.createElement(tag, { is: content.is }),
            typeof content === 'string'
                ? tag.innerHTML = content
                //todo add append
                : Object.keys(content)
                    .map(attr => {
                        if (tag.hasOwnProperty(attr)) {
                            tag[attr] = content[attr]
                        } else
                            tag.setAttribute(attr, content[attr])
                    }),
            //console.log(tag)            ,
            inject
                ? inject.append(tag)
                : null,
            tag// return
        );

    function formatSecondsAsTime(secs, msec, format) {
        var hr = Math.floor(secs / 3600);
        var min = Math.floor((secs - (hr * 3600)) / 60);
        var sec = Math.floor(secs - (hr * 3600) - (min * 60));
        var msec_accuracy = 1000;
        msec = (msec) ? '.' + Math.floor(((secs % 1000) - sec) * msec_accuracy) : ''; //empty if second parameter msec==false

        if (hr < 10) { hr = "0" + hr; }
        if (min < 10) { min = "0" + min; }
        if (sec < 10) { sec = "0" + sec; }
        if (hr) { hr = "00"; }

        if (format != null) {
            var formatted_time = format.replace('hh', hr);
            formatted_time = formatted_time.replace('h', hr * 1 + ""); // check for single hour formatting
            formatted_time = formatted_time.replace('mm', min);
            formatted_time = formatted_time.replace('m', min * 1 + ""); // check for single minute formatting
            formatted_time = formatted_time.replace('ss', sec);
            formatted_time = formatted_time.replace('s', sec * 1 + ""); // check for single second formatting
            return formatted_time;
        } else {
            return hr + ':' + min + ':' + sec + msec;
        }
    }
    /*
        load
        loadstart			Fired when the user agent begins looking for media data.
        loadedmetadata		Fired when the player has initial duration and dimension information.
        loadeddata			Fired when the player has downloaded data at the current playback position.
        loadedalldata		Fired when the player has finished downloading the source data.
        canplay				Fired when
        play				Fired whenever the media begins or resumes playback.
        pause				Fired whenever the media has been paused.
        timeupdate			Fired when the current playback position has changed. During playback this is fired every
        15-250 milliseconds, depnding on the playback technology in use.
        ended				Fired when the end of the media resource is reached. currentTime == duration
        durationchange		Fired when the duration of the media resource is changed, or known for the first time.
        progress			Fired while the user agent is downloading media data.
        resize				Fired when the width and/or height of the video window changes.
        volumechange		Fired when the volume changes.
        error				Fired when there is an error in playback.
        fullscreenchange	Fired when the player switches in or out of fullscreen mode.
     */

    let attachListeners = ({
        root = window,
        log = function (evt) {
            let args = [...arguments];
            args.shift();
            console.log(`%c IHF Video: ${evt.type}`, 'background:gold', ...args)
        },
        name = { [window]: 'window', [document]: 'document' }[root] || root.nodeName,
        events = [
            // ["load"],
            // ["DOMContentLoaded"],
            // ["readystatechange"],
        ]
    }) => events.map(
        ([
            eventName,
            eventFunc = log
        ]) => {
            let func = evt => {
                log(evt);
                return eventFunc(evt);
            }
            root.addEventListener(eventName, func);
            return () => root.removeEventListener(eventName, func)
        })

    customElements.define('ihf-video', class extends HTMLElement {
        constructor() {
            super()
            this.removeListeners = [
                ...attachListeners(window),
                ...attachListeners(document),
                ...attachListeners(this),
            ];
            var template = document.getElementById('ihf-video-template1').content;
            this.attachShadow({ mode: 'open' }).appendChild(template.cloneNode(true));
            this.currentChapter = 1;
            this.lastChapter = 0;
            this.initElement = true;// canplay event fires also on seek!
        }
        $(selector) {
            return this.shadowRoot.querySelector(selector)
        }
        title(txt) {
            this.$('#title').innerHTML = txt + ' ' + this.getAttribute("title");
        }
        play() {
            this.classList.add("playing");
            this.playbutton.classList.add("playing");
            this.title('Playing');
            this.video.play();
        }
        pause() {
            this.classList.remove("playing");
            this.playbutton.classList.remove("playing");
            this.title('Paused');
            this.video.pause();
        }
        get paused() {
            return this.playbutton.classList.contains("playing")
        }
        toggle() {
            if (!this.paused) this.play();
            else this.pause();
        }
        seek(chapter) {
            //this.currentChapter = 1;
            this.chapters.map(chapter => chapter.div.seen(false));
            this.video.currentTime = chapter.getAttribute("time");
            this.play();
            this.play();
        }
        connectedCallback() {
            window.setTimeout(() => {
                let $element = this;
                this.video = this.$("video");
                this.playbutton = this.$(".play-button");
                this.title("Ready");
                attachListeners({
                    root: this.video,
                    events: [
                        ["loadstart"],
                        ["loadedmetadata"],
                        ["loadeddata"],
                        ["play"],
                        ["pause"],
                        ["timeupdate", function (evt) {
                            let timestamp = $element.video.currentTime;
                            $element.$(".time").innerHTML = formatSecondsAsTime(timestamp, true);
                            let chapter, nr = 0;
                            chapter = $element.chapters[nr];
                            while (chapter && timestamp > chapter.time) {
                                chapter.div.seen(true);
                                //console.log(timestamp > chapter.time, $element.currentChapter, $element.lastChapter)
                                chapter = $element.chapters[++nr];
                            }
                            $element.currentChapter = nr;
                            $element.setAttribute("chapter", $element.currentChapter);
                        }],
                        ["canplay", function (evt) {
                            //$element.pause();
                            //$element.pause();
                            //this = <video>
                            if ($element.initElement) {
                                $element.video.addEventListener("click", evt => $element.toggle());
                                $element.playbutton.addEventListener("click", evt => $element.toggle());
                                $element.setAttribute("chapter", $element.currentChapter);
                                $element.pause();
                            }
                            $element.initElement = false;
                        }],
                        ["ended", function (evt) {
                            //$element.pause();
                            $element.title('Ended');
                        }]
                    ]
                })
                this.chapters = this.innerHTML
                    .split("#")
                    .map(line => line
                        .trim()
                        .split("=="))
                    .filter(x => x[1])
                    .map(([time, title], idx) => {
                        let div = createElement("ihf-video-chapter");
                        div.title = title;
                        div.setAttribute("time", time);
                        div.setAttribute("chapter", idx + 1);
                        this.lastChapter++;
                        return {
                            chapterNr: idx + 1,
                            time: parseFloat(time),
                            title: title.trim(),
                            div
                        }
                    });

                this.$(".chapters").innerHTML = '';
                this.$(".chapters").append(...this.chapters.map(chapter => chapter.div));
            });
        }
        disconnectedCallback() {
            this.removeListeners(removeFunc => removeFunc());
        }
    });

    customElements.define("ihf-video-chapter", class extends HTMLElement {
        constructor() {
            super();
        }
        seen(state = false) {
            this.classList.toggle("chapter--seen", state);
        }
        connectedCallback() {
            setTimeout(() => {
                let $ihf_video = this.getRootNode().host;
                let time = this.getAttribute("time");
                let title = this.getAttribute("title");
                let chapterNr = this.getAttribute("chapter");
                let timespan = createElement('SPAN', String(formatSecondsAsTime(time)));
                timespan.classList.add("chapter--time");
                let titlespan = createElement('SPAN', title);
                titlespan.classList.add("chapter--title")
                this.id = "chapter" + chapterNr;
                this.append(timespan, titlespan);
                attachListeners({
                    root: this,
                    events: [["click", evt => $ihf_video.seek(this)]]
                })
            })
        }
    });
})({/* inject default icons here */ });