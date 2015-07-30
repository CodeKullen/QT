var EXPORTED_SYMBOLS = ['FX'];

Components.utils.import("resource://qlk-modules/qlk-timer.jsm");
Components.utils.import("resource://qlk-modules/qlk-debug.jsm");


/**
 * Effects
 */
var FX = $ = {
	queue: {},
	
	animate: function(el, animations, duration, callback)
	{
		if(!el || !animations) return;

		// default duration
		duration = duration != undefined ? duration : 400;

		$._enqueue(el.id, function() {
			$._start(el, animations, duration, callback);
		});

		// try to start
		$._dequeue(el.id);
	},

	_enqueue: function(id, fn)
	{
		if(!$.queue[id]) {
			$.queue[id] = [];
		}

		$.queue[id].push(fn);
	},

	_dequeue: function(id)
	{
		if(!$.queue[id] || !$.queue[id].length || $.queue[id][0] === 'running') return;
		
		let fn = $.queue[id].shift();

		if(fn) {
			// enqueue running state
			$.queue[id].unshift('running');
			
			fn.call();
		}
	},

	_start: function(el, animations, duration, callback)
	{
		// get window for the element (for timer function calls)
		let w = el.ownerDocument.defaultView;
		
		let startTime = (new Date).getTime(),
				props = [],
				s = el.style;

		for(let i = 0; i < animations.length; i++) {
			let o = {
				on: true,
				units: ''
			};

			if(typeof animations[i] == 'string') {
				o.on = (animations[i].substr(-2) == 'In');

				if(o.on === (el.offsetHeight > 0 || el.offsetWidth > 0)) {
					// manually set hidden state for hiding animation (just as it will be set at the end of animation)
					if(!o.on) {
						s.display = 'none';
					}

					continue;
				}

				if(animations[i].indexOf('slide') === 0) {
					s.overflow = 'hidden';
					s.height = 'auto';
					s.visibility = 'hidden';
					s.display = 'block';

					o.property = 'height';
					o.start = o.on ? 0 : el.clientHeight;
					o.end = o.on ? el.clientHeight : 0;
					o.units = 'px';

					s.display = 'none';
					s.visibility = '';
				}
				else if(animations[i].indexOf('fade') === 0) {
					let css = w.getComputedStyle(el, null)

					o.property = 'opacity';
					o.start = o.on ? 0 : parseFloat(css.opacity);
					o.end = o.on ? parseFloat(css.opacity) : 0;
				}
			}
			else {
				o.property = animations[i].property;
				o.start = animations[i].start;
				o.end = animations[i].end;
				o.units = animations[i].units || '';
			}

			if(o.start == o.end) continue;

			if(duration) {
				// set start value
				s[o.property] = o.start + o.units;

				props.push(o);
			}
			else {
				// set end value directly
				s[o.property] = o.end + o.units;
			}
		}

		if(props.length > 0) {
			// NOTE: do not use 'block' here, since some element can have different value
			s.display = '';

			let timer = new Timer(function() {
				let v = 0,
						delta = ((new Date).getTime() - startTime) / duration;

				for(let i = 0; i < props.length; i++) {
					if(delta >= 1) {
						v = props[i].end;
						delta = 1;
					}
					else {
						v = props[i].start + delta * (props[i].end - props[i].start);
					}

					s[props[i].property] = v + (props[i].units || '');

					if(delta >= 1) {
						if(!props[i].on) {
							s.display = 'none';
						}

						if(props[i].property == 'height') {
							s.overflow = '';
							s.height = '';
						}
						else if(props[i].property == 'opacity') {
							s.opacity = '';
						}

						timer.cancel();
						$._stop(el.id, callback);
					}
				}
			}, 5, Timer.TYPE_REPEATING_PRECISE);
		}
		else {
			$._stop(el.id, callback);
		}
	},

	_stop: function(id, callback)
	{
		if(typeof callback == 'function') {
			callback.call();
		}

		// remove running state
		if($.queue[id] && $.queue[id].length) {
			$.queue[id].shift();
		}

		// try to run next animation
		$._dequeue(id);
	}
};

Debug.register(FX, this);