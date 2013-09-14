/* based on a demo from: http://revealjs.herokuapp.com/ */

// Custom events in Javascript
// from: http://www.nczonline.net/blog/2010/03/09/custom-events-in-javascript/
function EventTarget() {
    this._listeners = {};
}

EventTarget.prototype = {

    constructor: EventTarget,

    addListener: function(type, listener){
        if (typeof this._listeners[type] == "undefined"){
            this._listeners[type] = [];
        }

        this._listeners[type].push(listener);
    },

    fire: function(event){
        if (typeof event == "string"){
            event = { type: event };
        }
        if (!event.target){
            event.target = this;
        }

        if (!event.type){  //falsy
            throw new Error("Event object missing 'type' property.");
        }

        if (this._listeners[event.type] instanceof Array){
            var listeners = this._listeners[event.type];
            for (var i=0, len=listeners.length; i < len; i++){
                listeners[i].call(this, event);
            }
        }
    },

    removeListener: function(type, listener){
        if (this._listeners[type] instanceof Array){
            var listeners = this._listeners[type];
            for (var i=0, len=listeners.length; i < len; i++){
                if (listeners[i] === listener){
                    listeners.splice(i, 1);
                    break;
                }
            }
        }
    }
};

var GestureSensor = function(options) {

	var defaultOptions = {
		debug: false,
		videoId: 'video',
		canvasId: 'canvas-main',
		auxCanvasId: 'canvas-aux',
		controlPanelId: 'controls',
		success: $.noop,
		error: function(evt) {
			console.error("Initialization failed")
		},
		action: $.noop

	}

	var getControlPanel = function() {
		return $("#"+opts.controlPanelId)
	}

	var getControl = function(name) {
	  return getControlPanel().find("."+name)
	}

	var showControlPanel = function() {
		getControlPanel().show()
	}

	var displayDirections = function(dirs) {
	  var directions = ["down", "up", "right", "left", "fire"]
	  for(var i=0; i<directions.length; i++) {
	  	control = directions[i]
	    if(dirs[control])
	      /* addClass does not work for SVG... */
	      getControl(control).attr("class", "button "+control+" active")     
	    else
	      getControl(control).attr("class", "button "+control)     
	  }	  
	}

	var opts = defaultOptions
	for(var key in options) {
		opts[key] = options[key]
	}

	var target = new EventTarget()

	this.addGestureListener = function(handler) {
		target.addListener("gesture", handler);		
	}
	this.removeGestureListener = function(handler) {
		target.removeListener("gesture", handler);		
	}

	if(opts.action) this.addGestureListener(opts.action);


	var makeVideo = function(id){
	    var vid = document.createElement('video')
	    vid.setAttribute('id',id)
	    if(!opts.debug) vid.setAttribute('style',"display: none;")
	    vid.setAttribute('autoplay',true);
	    document.getElementsByTagName('body')[0].appendChild(vid)
	    return vid;
	} 

	var makeCanvas = function(id) {
	    var vid = document.createElement('canvas')
	    vid.setAttribute('id',id)
	    if(!opts.debug) vid.setAttribute('style',"display: none;")
	    document.getElementsByTagName('body')[0].appendChild(vid)
	    return vid;
	} 


	var video = makeVideo(opts.videoId);
	var videoCanvas = makeCanvas(opts.canvasId)
	var videoCtx = videoCanvas.getContext('2d')
	var auxCanvas = makeCanvas(opts.auxCanvasId)
	var auxCtx = auxCanvas.getContext('2d')
	var 
		compression = 5,
		width = height = 0

	/* initialize... */
	navigator.webkitGetUserMedia({audio:false,video:true},function(stream) {
		video.src = window.webkitURL.createObjectURL(stream)
		video.addEventListener('play',
			function() {
				/* resize canvases */
				width=Math.floor(video.videoWidth/compression)
				height=Math.floor(video.videoHeight/compression)
				videoCanvas.width = auxCanvas.width = width
				videoCanvas.height = auxCanvas.height = height
				showControlPanel()
				startProcessing()
			}
		)
		/* all OK! */
		opts.success()
	},function() {
		opts.error()
	})


	var
		lastFrame,
		lastPosition,
		timer

	function startProcessing() {
		console.log("Processing started.")
		timer = setInterval(processFrame,1000/25)
	}

	function stopProcessing() {
		console.log("Processing ended.")
		clearInterval(timer)
	}

	function processFrame() {
		videoCtx.drawImage(video,width,0,-width,height)
		var frame = videoCtx.getImageData(0,0,width,height)
		frame = skinfilter(frame)
		var deltaImage = detectMove(frame, lastFrame, lastPosition)	
		auxCtx.putImageData(deltaImage,0,0)
		lastFrame = frame
	}

	function rgb2hsv(r, g, b) {    
        r = r/255
        g = g/255
        b = b/255;
        var max = Math.max(r, g, b)
        var min = Math.min(r, g, b);
        var h, s, v = max;
        var d = max - min;
        s = max == 0 ? 0 : d / max;
        if(max == min){
            h = 0; // achromatic
        } else {
            switch(max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        return [h, s, v];
    }

	function skinfilter(frame) {
		var 
			huemin=0.0,
			huemax=0.10,
			satmin=0.0,
			satmax=1.0,
			valmin=0.4,
			valmax=1.0
		
		var skin_filter = videoCtx.getImageData(0,0,width,height)
		var total_pixels = skin_filter.width * skin_filter.height
		var index_value = total_pixels*4
		
		var count_data_big_array=0;
		for (var y=0 ; y<height ; y++)
		{
			for (var x=0 ; x<width ; x++)
			{
				index_value = x+y*width
				r = frame.data[count_data_big_array]
        		g = frame.data[count_data_big_array+1]
        		b = frame.data[count_data_big_array+2]
        		a = frame.data[count_data_big_array+3]

        		hsv = rgb2hsv(r,g,b);
        		//When the hand is too lose (hsv[0] > 0.59 && hsv[0] < 1.0)
				//Skin Range on HSV values
				if(((hsv[0] > huemin && hsv[0] < huemax)||(hsv[0] > 0.59 && hsv[0] < 1.0))&&(hsv[1] > satmin && hsv[1] < satmax)&&(hsv[2] > valmin && hsv[2] < valmax)) {
	       			skin_filter.data[count_data_big_array]   = r
					skin_filter.data[count_data_big_array+1] = g
					skin_filter.data[count_data_big_array+2] = b
					skin_filter.data[count_data_big_array+3] = a
	        	} else {
	        		skin_filter.data[count_data_big_array]   = 0 
					skin_filter.data[count_data_big_array+1] = 0
					skin_filter.data[count_data_big_array+2] = 0
					skin_filter.data[count_data_big_array+3] = 0
	        	}

        		count_data_big_array=index_value*4;
			}
		}
		return skin_filter
	}


	function detectMove(frame, last, lastPosition) {
		var thresh = 150
		var delt = videoCtx.createImageData(width,height)
		if(last) {
			var totalx=0, totaly=0, totald=0, totaln=delt.width*delt.height, dscl=0, pix=totaln*4;
			/* for all pixels... */
			while(pix-=4){
				/* measure change between this and previus image */
				var d=Math.abs(
					frame.data[pix]-last.data[pix]
				)+Math.abs(
					frame.data[pix+1]-last.data[pix+1]
				)+Math.abs(
					frame.data[pix+2]-last.data[pix+2]
				)
				if(d>thresh){
					delt.data[pix] = 160
					delt.data[pix+1] = delt.data[pix+2] = delt.data[pix+3] = 255
					totald+=1
					totalx+=((pix/4)%width)
					totaly+=(Math.floor((pix/4)/delt.height))
				}
				else {
					delt.data[pix] = delt.data[pix+1] = delt.data[pix+2] = delt.data[pix+3] = 0
				}
			}
		}
		if(totald) {
			var position = {
				x:totalx/totald,
				y:totaly/totald,
				d:totald
			}
			state = handleMove(state, position, lastPosition)
		}
		return delt
	}

	function calibrate(position) {
		lastPosition = {
			x:position.x,
			y:position.y,
			d:position.d
		}
	}

	var State = {
		WAITING: 0,
		INGESTURE: 2,
		FOUND: 1
	}

	var avg = 0
	var state = State.WAITING

	function handleMove(state, position, lastPosition) {
		var movethresh=2
		var brightthresh=300
		var overthresh=1000
	
		avg=0.9*avg+0.1*position.d
		var 
			davg = position.d - avg,
			good = davg > brightthresh
		switch(state) {
			case State.WAITING:
				if(good) {
					//Found a gesture, waiting for next move
					calibrate(position)
					return State.FOUND
				}
				break
			case State.FOUND:
				//Got next move, do something based on direction
				var dx = position.x - lastPosition.x
				var dy = position.y - lastPosition.y
				var dirx = Math.abs(dy) < Math.abs(dx) //(dx,dy) is on a bowtie
				//console.log(position.x+","+position.y+" "+dx+","+dy)
				//console.log(good,davg)
				var evt = {"type":"gesture"}
				if(davg > overthresh) {
					evt.over = true
				}
				if(dirx) {
					if(dx < -movethresh) {
						evt.direction = 'left'
					}
					else if(dx > movethresh) {
						evt.direction = 'right'
					}
				} else {
					if(dy > movethresh) {
						evt.direction = 'down'
					}
					else if(dy < -movethresh) {
						evt.direction = 'up'
					}
				}
				if(evt.direction) {
					target.fire(evt)
					var dirs = {}
					dirs[evt.direction] = true
					displayDirections(dirs)
				}
				return State.INGESTURE
			case State.INGESTURE: 
				//Wait for gesture to end
				if(!good) { 
					//Gesture ended
					displayDirections({})
					return State.WAITING
				}
				break;			
		}
		return state
	}

	return this

}
