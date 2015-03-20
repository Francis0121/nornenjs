var NORNENJS_ENUMS = {
    STREAM_TYPE: {
        START: 1,
        FINISH: 2,
        EVENT: 3
    },
    
    RENDERING_TYPE : {
        VOLUME : 1,
        MIP : 2,
        MPR : 3
    },

    MPR_TYPE : {
        X : 1,
        Y : 2,
        Z : 3
    },
    
    QUALITY_TYPE : {
        HIGH : 1,
        LOW : 2
    }
};

var NORNENJS_STATIC = {
    MPR_DEFAULT_OPTION : {
        rotationX : 0,
        rotationY : 0,
        positionZ : 3.0
    }
};

/**
 *  Need Socket.io client link, Binary.js link
 *  
 * @param volumePrimaryNumber
 * @param host
 * @param socketIoPort
 * @param streamPort
 * @param selector
 * @constructor
 */
var Nornenjs = function(volumePrimaryNumber, host, socketIoPort, streamPort, selector){
    
    this.host = host; // host
    this.socketIoPort = socketIoPort; // socket.io port
    this.streamPort = streamPort; // streming port
    
    this.selector = selector == undefined ? 'view_canvas' : selector;
    
    // ~ socket
    this.socket = null;
    this.socketOption = { reconnection : false };
    this.isConnect = false;
    
    // ~ stream
    this.client = null;
    this.buffer = null;
    this.sendOption = {
        streamType : NORNENJS_ENUMS.STREAM_TYPE.START,
        renderingType : NORNENJS_ENUMS.RENDERING_TYPE.VOLUME,
        volumePn : volumePrimaryNumber,
        brightness : 1.0,
        positionZ : 3.0,
        transferOffset : 0.0,
        rotationX : 0,
        rotationY : 0,
        transferScaleX : 0.0,
        transferScaleY : 0.0,
        transferScaleZ : 0.0,
        mprType : NORNENJS_ENUMS.MPR_TYPE.X,
        isMobile : isMobile.any() ? 1 : 0,
        quality : NORNENJS_ENUMS.QUALITY_TYPE.LOW
    };
    this.sendOptionSize = null;
    
    // ~ event
    this.mouse = {
        isOn : false,
        beforeX : null,
        beforeY : null
    };
    
    this.touch = { 
        isOn : false, 
        beforeX : null,
        beforeY : null,
    };
    
    // ~ fps calculate
    this.fps = {
        active : true,
        option : {
           frame : 0
        }
    };
    
    // ~ uuid
    this.uuid = null;
    
    // ~ loader
    this.loader = {
        active : false,
        step : 0,
        interval : null
    };
};

/**
 * Connect socket.io and Binaryjs
 */
Nornenjs.prototype.connect = function(debugCallback, fpsCallback){
    // ~ set canvas
    var canvas = document.getElementById(this.selector),
        width = canvas.clientWidth;

    canvas.width = width;
    canvas.height = width;
    
    // ~ uuid
    this.uuid = this.generateUUID();
    
    // ~ set socket.io
    var socketUrl = 'http://' + this.host + ':' + this.socketIoPort;
    this.socket = io.connect(socketUrl, this.socketOption);

    // ~ set stream
    //var streamUrl = 'ws://' + this.host + ':' + this.streamPort;
    //this.client = new BinaryClient(streamUrl);

    // ~ run
    this.socketIo(debugCallback);

    this.addEvent();
    
    // ~ fps 
    if(fpsCallback != null && fpsCallback != undefined){
        setInterval(this.fpsInterval, 1000, this, fpsCallback);
    }else{
        this.fps.active = false;
    }
};

/**
 * *
 * @param $this
 * @param callback
 */
Nornenjs.prototype.fpsInterval = function($this, callback){
    callback($this.fps.option.frame);
    $this.fps.option.frame = 0;
};

/**
 * * 
 * @param $this
 */
Nornenjs.prototype.loading= function($this){
    if(!$this.loader.active){
        return;
    }
    
    var canvas = document.getElementById($this.selector);
    var context = canvas.getContext('2d');

    context.save();
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width / 2, canvas.height / 2);
    context.scale(0.4, 0.4);
    context.rotate(-Math.PI / 2);
    context.strokeStyle = 'black';
    context.fillStyle = 'white';
    context.lineWidth = 8;
    context.lineCap = 'round';

    var step = $this.loader.step;
    context.fillStyle = 'black';
    context.save();
    context.rotate(step * Math.PI / 30);
    context.strokeStyle = '#e87722';
    context.fillStyle = '#e87722';
    context.lineWidth = 10;

    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(68, 0);
    context.stroke();
    context.fill();
    context.restore();
    context.beginPath();
    context.lineWidth = 10;
    context.strokeStyle = '#3a5a79';
    context.arc(0, 0, 80, 0, Math.PI * 2, true);
    context.stroke();
    context.restore();

    context.font = 'bold 75% Helvetica Arial';
    context.textAlign = 'center';
    context.fillText('Please wait for the exit to other users', canvas.width/2, canvas.height/2 + 65);

    $this.loader.step += 1;
    
};

/**;
 * Connected confirm user : User access deny
 */
Nornenjs.prototype.socketIo = function(debugCallback){
    var $this = this;
    
    this.socket.emit('join', { uuid : $this.uuid} );

    this.socket.on('message', function(data){
        if(!data.success){
            $this.loader.active = true;
            $this.loader.interval = setInterval($this.loading, 100, $this);
            return;
        }

        $this.socket.emit('stream');
        //$this.streamOn();
        //
        //$this.sendOption.streamType = NORNENJS_ENUMS.STREAM_TYPE.START;
        //$this.isConnect = true;
        //$this.send();
        //
        //setTimeout($this.finish, 1000, $this);
    });
    
    var count = 0;
    
    this.socket.on('jpeg', function(data){
        var blob = new Blob( [ data ], { type: "image/jpeg" } );
        var url = (window.URL || window.webkitURL).createObjectURL(blob);
        var canvas = document.getElementById('view_canvas');
        var ctx = canvas.getContext('2d');

        var img = new Image(512, 512);
        img.onload = function(){
            ctx.drawImage(img, 0, 0, 512, 512, 0, 0, canvas.clientWidth, canvas.clientWidth);
            count++;
        };
        img.src = url;
    });
    
    var printCount = function(){
        console.log('FPS ', count);
        count = 0;
    };
    
    setInterval(printCount, 1000);

    this.socket.on('disconnected', function(data){
        $this.loader.active = false;
        clearInterval($this.loader.interval);
        $this.socket.emit('join', { uuid : $this.uuid} );
    });
    
    if(debugCallback != undefined){
        this.socket.on('debug', function(data){
            debugCallback(data);
        });
    }
};

/**
 * Connect binaryjs
 */
Nornenjs.prototype.streamOn = function(){
    var $this = this;
    
    this.client.on('stream', function(stream, meta){

        var parts = [];

        stream.on('data', function(data){
            parts.push(data);
        });

        stream.on('end', function(){
            var url = (window.URL || window.webkitURL).createObjectURL(new Blob(parts));
            var canvas = document.getElementById($this.selector);
            var ctx = canvas.getContext('2d');

            var img = new Image(512, 512);
            img.onload = function(){
                ctx.drawImage(img, 0, 0, 512, 512, 0, 0, canvas.clientWidth, canvas.clientWidth);
            };
            img.src = url;
            
            if($this.fps.active){
                $this.fps.option.frame+=1;
            }
        });
    });
};

/**
 * Make buffer and send;
 */
Nornenjs.prototype.send = function(){
    
    this.buffer = new ArrayBuffer(56 + this.uuid.length);
    var floatArray = new Float32Array(this.buffer, 0, 14);

    floatArray[0] = this.sendOption.streamType;
    floatArray[1] = this.sendOption.volumePn;
    floatArray[2] = this.sendOption.renderingType;
    floatArray[3] = this.sendOption.brightness;
    floatArray[4] = this.sendOption.positionZ;
    floatArray[5] = this.sendOption.transferOffset;
    floatArray[6] = this.sendOption.rotationX;
    floatArray[7] = this.sendOption.rotationY;
    floatArray[8] = this.sendOption.transferScaleX;
    floatArray[9] = this.sendOption.transferScaleY;
    floatArray[10] = this.sendOption.transferScaleZ;
    floatArray[11] = this.sendOption.mprType;
    floatArray[12] = this.sendOption.isMobile;
    floatArray[13] = this.sendOption.quality;
    
    var strArray = new Uint8Array(this.buffer, 56, this.uuid.length);
    for (var i=0, strLen=this.uuid.length; i<strLen; i++) {
        strArray[i] = this.uuid.charCodeAt(i);
    }
    
    this.client.send(this.buffer);
};

/**
 * * 
 * @param $this
 */
Nornenjs.prototype.finish = function($this){
    $this.sendOption.streamType = NORNENJS_ENUMS.STREAM_TYPE.FINISH;
    $this.send();
};

/**
 * * 
 */
Nornenjs.prototype.addEvent = function(){

    if(isMobile.any()){
        this.touchEvent();
    }else{
        this.mouseEvent();
    }

    this.resize();
};

/**
 * * 
 */
Nornenjs.prototype.touchEvent = function(){
    var $this = this;
    var el = document.getElementById($this.selector);

    el.addEventListener('touchstart', function(evt){
        evt.preventDefault();
        var touches = evt.changedTouches;

        if(touches.length == 1){
            $this.touch.isOn = true;
            $this.touch.beforeX = touches[0].pageX;
            $this.touch.beforeY = touches[0].pageY;
        }

    });

    el.addEventListener('touchmove', function(evt){
        evt.preventDefault();
        var touches = evt.changedTouches;

        if($this.touch.isOn){
            $this.sendOption.streamType = NORNENJS_ENUMS.STREAM_TYPE.EVENT;

            $this.sendOption.rotationX += (touches[0].pageX - $this.touch.beforeX)/10.0;
            $this.sendOption.rotationY += (touches[0].pageY - $this.touch.beforeY)/10.0;

            $this.touch.beforeX = touches[0].pageX;
            $this.touch.beforeY = touches[0].pageY;
            
            $this.send();
        }

    });

    el.addEventListener('touchend', function(evt){
        evt.preventDefault();
        $this.touch.isOn = false;
        setTimeout($this.finish, 1000, $this);
    });

    el.addEventListener('touchcancel', function handleCancel(evt) {
        evt.preventDefault();
        $this.touch.isOn = false;
        setTimeout($this.finish, 1000, $this);
    });

    el.addEventListener('touchleave', function(evt){
        evt.preventDefault();
        $this.touch.isOn = false;
        setTimeout($this.finish, 1000, $this);
    });
    
};

/**
 * * 
 */
Nornenjs.prototype.mouseEvent = function(){

    var $this = this;
    var el = document.getElementById($this.selector);

    el.addEventListener('mousedown', function(evt){
        evt.preventDefault();

        $this.mouse.isOn = true;
        $this.mouse.beforeX = evt.pageX;
        $this.mouse.beforeY = evt.pageY;

    });

    el.addEventListener('mousemove', function(evt){
        evt.preventDefault();

        if($this.mouse.isOn){
            $this.sendOption.streamType = NORNENJS_ENUMS.STREAM_TYPE.EVENT;

            $this.sendOption.rotationX += (evt.pageX - $this.mouse.beforeX)/5.0;
            $this.sendOption.rotationY += (evt.pageY - $this.mouse.beforeY)/5.0;
            
            $this.mouse.beforeX = evt.pageX;
            $this.mouse.beforeY = evt.pageY;

            $this.send();
        }

    });

    document.addEventListener('mouseup', function(evt){
        evt.preventDefault();
        $this.mouse.isOn = false;
        setTimeout($this.finish, 1000, $this);
    });
    
};

/**
 * * 
 */
Nornenjs.prototype.resize = function(){
    var $this = this;

    var supportsOrientationChange = 'onorientationchange' in window,
        orientationEvent = supportsOrientationChange ? 'orientationchange' : 'resize';
    
    window.addEventListener(orientationEvent, function(event){
        var el = document.getElementById($this.selector),
            width = el.clientWidth;
        el.width = width;
        el.height = width;
        $this.finish($this);

        $this.sendOption.streamType = NORNENJS_ENUMS.STREAM_TYPE.EVENT;
        $this.send();
        setTimeout($this.finish, 1000, $this);
    });
};

/**
 * * 
 * @param renderingType
 */
Nornenjs.prototype.type = function(renderingType){
    if(renderingType == NORNENJS_ENUMS.RENDERING_TYPE.VOLUME){
        // ~ Volume
    }else if(renderingType == NORNENJS_ENUMS.RENDERING_TYPE.MPR){
        // ~ MPR
        this.sendOption.rotationX = NORNENJS_STATIC.MPR_DEFAULT_OPTION.rotationX;
        this.sendOption.rotationY = NORNENJS_STATIC.MPR_DEFAULT_OPTION.rotationY;
        this.sendOption.positionZ = NORNENJS_STATIC.MPR_DEFAULT_OPTION.positionZ;
    }else if(renderingType == NORNENJS_ENUMS.RENDERING_TYPE.MIP){
        // ~ MIP
    }else{
        return;
    }

    this.sendOption.streamType = NORNENJS_ENUMS.STREAM_TYPE.EVENT;
    this.sendOption.renderingType = renderingType;

    this.send();
    setTimeout(this.finish, 1000, this);
};

/**
 * * 
 * @param type
 */
Nornenjs.prototype.axisType = function(type){

    this.sendOption.streamType = NORNENJS_ENUMS.STREAM_TYPE.EVENT;
    this.sendOption.mprType = type;
    
    if(type == NORNENJS_ENUMS.MPR_TYPE.X){
        var value = this.sendOption.transferScaleY != 0 ? this.sendOption.transferScaleY : this.sendOption.transferScaleZ;
        this.sendOption.transferScaleX = value;
        this.sendOption.transferScaleY = 0;
        this.sendOption.transferScaleZ = 0;
    }else if(type == NORNENJS_ENUMS.MPR_TYPE.Y){
        var value = this.sendOption.transferScaleX != 0 ? this.sendOption.transferScaleX : this.sendOption.transferScaleZ;
        this.sendOption.transferScaleX = 0;
        this.sendOption.transferScaleY = value;
        this.sendOption.transferScaleZ = 0;
    }else if(type == NORNENJS_ENUMS.MPR_TYPE.Z){
        var value = this.sendOption.transferScaleX != 0 ? this.sendOption.transferScaleX : this.sendOption.transferScaleY;
        this.sendOption.transferScaleX = 0;
        this.sendOption.transferScaleY = 0;
        this.sendOption.transferScaleZ = value;
    }

    this.send();
    setTimeout(this.finish, 1000, this);
    
};

/**
 * * 
 * @param value
 * @param isFinish
 */
Nornenjs.prototype.axis = function(value, isFinish){

    this.sendOption.streamType = NORNENJS_ENUMS.STREAM_TYPE.EVENT;

    if(this.sendOption.mprType == NORNENJS_ENUMS.MPR_TYPE.X){
        this.sendOption.transferScaleX = value;
    }else if(this.sendOption.mprType == NORNENJS_ENUMS.MPR_TYPE.Y){
        this.sendOption.transferScaleY = value;
    }else if(this.sendOption.mprType == NORNENJS_ENUMS.MPR_TYPE.Z){
        this.sendOption.transferScaleZ = value;
    }

    this.send();
    if(isFinish){
        setTimeout(this.finish, 1000, this);
    }
};

/**
 * * 
 * @param value
 * @param isFinish
 */
Nornenjs.prototype.scale = function(value, isFinish){
    this.sendOption.streamType = NORNENJS_ENUMS.STREAM_TYPE.EVENT;
    this.sendOption.positionZ = value;
    this.send();
    if(isFinish){
        setTimeout(this.finish, 1000, this);
    }
}

/**
 * * 
 * @param value
 * @param isFinish
 */
Nornenjs.prototype.brightness = function(value, isFinish){
    this.sendOption.streamType = NORNENJS_ENUMS.STREAM_TYPE.EVENT;
    this.sendOption.brightness = value;
    this.send();
    if(isFinish){
        setTimeout(this.finish, 1000, this);
    }
};

/**
 * Set otf information
 * 
 * @param value
 * @param isFinish
 */
Nornenjs.prototype.otf = function(value, isFinish){
    this.sendOption.streamType = NORNENJS_ENUMS.STREAM_TYPE.EVENT;
    this.sendOption.transferOffset = value;
    this.send();
    if(isFinish){
        setTimeout(this.finish, 1000, this);
    }
};

/**
 * Set quality information
 *
 * @param value - NORNENJS_ENUMS.QUALITY.HIGH : high quality, NORNENJS_ENUMS.QUALITY.LOW : low quality
 */
Nornenjs.prototype.quality = function(value, isFinish){
    this.sendOption.streamType = NORNENJS_ENUMS.STREAM_TYPE.EVENT;
    this.sendOption.quality = value;
    this.send();

    setTimeout(this.finish, 1000, this);
};

/**
 * 
 * @returns {string}
 */
Nornenjs.prototype.generateUUID = function (){
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};

var isMobile = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i);
    },
    any: function() {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};