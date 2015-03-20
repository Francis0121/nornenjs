//#######################################

var ENUMS = require('./enums');
var logger = require('./logger');
var sqlite = require('./sql/default');

var path = require('path');
var HashMap = require('hashmap').HashMap;
var Jpeg = require('jpeg').Jpeg;
var Png = require('png').Png;

var socketIo = require('socket.io');

var CudaRender = require('./render').CudaRender;
var cu = require('./load');
var cuCtx = new cu.Ctx(0, cu.Device(0));

//#######################################

var CUDA_INTERVAL_MAP = new HashMap();

var NornenjsServer = function(server){

    this.MAX_CONNECTION_CLIENT = 10;

    this.CUDA_PTX_PATH = path.join(__dirname, '../src-cuda/volume.ptx');
    this.CUDA_DATA_PATH = path.join(__dirname, './data/');

    this.server = server;
    this.io = null;
};

NornenjsServer.prototype.connect = function(){
    this.io = socketIo.listen(this.server);
    this.socketIoEvent();
};

NornenjsServer.prototype.socketIoEvent = function(){

    var $this = this;
    var clientQueue = [];
    var streamClientCount = 0;

    this.io.sockets.on('connection', function(socket){

        /**
         * Connection User
         */
        socket.on('connectMessage', function(){

            var clientId = socket.id;

            var message = {
                error : '',
                success : false,
                clientId : clientId
            };

            if(streamClientCount < $this.MAX_CONNECTION_CLIENT){
                streamClientCount++;
                message.success = true;
            }else{
                clientQueue.push(clientId);
                message.error = 'Visitor limit';
            }

            logger.debug('[Connect] Stream user count [' + streamClientCount + ']');
            logger.debug('Send message client id [' + clientId + ']');

            socket.emit('connectMessage', message);
        });

        /**
         * Disconnection User - Wait queue client connect request
         */
        socket.on('disconnect', function () {
            
            var clientId = socket.id;
            
            if(clientQueue.indexOf(clientId) == -1){
                streamClientCount--;
                clearInterval(CUDA_INTERVAL_MAP.get(clientId));
                logger.debug('[Disconnect] Stream user count [' + streamClientCount + ']');
                logger.debug('Disconnect socket client id ['+ clientId +']');
            }

            var connectClientId = clientQueue.shift();

            if(connectClientId != undefined){
                logger.debug('Connect socket client id [' + connectClientId + ']');
                socket.broadcast.to(connectClientId).emit('otherClientDisconnect');
            }

        });


        /**
         * Stream data - from client
         */
        socket.on('stream', function(){

            var volumePn = 1;
            var clientId = socket.id;

            sqlite.db.get(sqlite.sql.volume.selectVolumeOne, { $pn: volumePn }, function(err, volume){

                logger.debug('[Stream] volume object ', volume);

                if(volume == undefined) {
                    logger.error('[Stream] Fail select volume data');
                    // TODO Announce fail lode volume data to client
                    return;
                }else {
                    logger.debug('[Stream] Register CUDA module ');

                    var cudaRender = new CudaRender(
                                            ENUMS.RENDERING_TYPE.VOLUME, $this.CUDA_DATA_PATH + volume.save_name,
                                            volume.width, volume.height, volume.depth,
                                            cuCtx, cu.moduleLoad($this.CUDA_PTX_PATH));
                    cudaRender.init();

                    CUDA_INTERVAL_MAP.set(clientId,
                        setInterval(makeImageInterval, 1000/60, cudaRender, socket));
                }
            });
        });

    });

};

module.exports.NornenjsServer = NornenjsServer;

/**
 * Make interval from cuda and stream to client
 *
 * @param cudaRender
 *  CudaRender Object
 */
function makeImageInterval(cudaRender, socket){
    var hrStart = process.hrtime();

    cudaRender.start();
    var hrCuda = process.hrtime(hrStart);
    logger.debug('Make start finish frame png compress execution time (hr) : %dms', hrCuda[1]/1000000);

    var jpeg = new Jpeg(cudaRender.d_outputBuffer, 512, 512, 'rgba');
    socket.emit('stream', jpeg.encodeSync());
    cudaRender.end();

    var hrEnd = process.hrtime(hrStart);
    logger.debug('Make start finish frame png compress execution time (hr) : %dms', hrEnd[1]/1000000);

};