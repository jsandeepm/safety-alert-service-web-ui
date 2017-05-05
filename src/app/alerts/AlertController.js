import AlertService from './AlertService';
import controllerModule from '../common/ControllerModule';
import DeepStreamService from '../common/DeepStreamService';
import BindMessages from './BindMessages';

class AlertController {
    constructor(AlertService, CommonService, DeepStreamService, BindMessages) {
        this.alertService = AlertService;
        this.commonService = CommonService;
        this.deepStreamService = DeepStreamService;
        this.bindMessages = BindMessages;
        this.alertMessages = "";
        this.mainMarker = {
            lat: 13.0601709,
            lng: 77.56245290000001,
            focus: true,
            message: "I am draggable",
            draggable: false,
            icon: {
                iconUrl: 'img/location-pointer.png',
                iconSize: [32, 32], // size of the icon
                iconAnchor: [22, 94], // point of the icon which will correspond to marker's location
                shadowAnchor: [4, 62],  // the same for the shadow
                popupAnchor: [-7, -90] // point from which the popup should open relative to the iconAnchor
            }
        };
        this.connection = this.deepStreamService.getServerConnection();

        angular.extend(this, {
            london: {
                lat: 13.0601709,
                lng: 77.56245290000001,
                zoom: 15
            },
            markers: {
                mainMarker: angular.copy(this.mainMarker)
            },
            position: {
                lat: 51,
                lng: 0
            }
        });
        this.sendMessage = [];
        this.readMessage = [];
        this.loadAsyncMobileVideos();
    };

    loadAlertsAsync() {
        console.log("this.alertmessages");
        this.list = this.connection.record.getRecord('safety/messages');
        this.list.subscribe((entries) => {
            console.log(entries);
            this.alertMessages = entries;
        });
        console.log(this.alertMessages);
        /*this.alertService.getAlertDataFromService().then((data) => {
         this.alertMessages = data;
         });*/
    };

    deleteRecordFromList(i){
        console.log("removing entry from list");
        console.log(i);
        console.log(this.list);
        // this.list.delete(i); removes all records. do not use
    }

    loadAsyncMobileVideos() {
        console.log("flowplayer");
        $("#player").flowplayer({
            live: true,
            swf: "video/flowplayer.swf",
            clip: {
                sources: [
                    {type: "video/mp4", src: "video/sanmay.mp4"}
                ]
            }
        });

        $("#myplayer").flowplayer({

            // option 1
            ratio: 3 / 4,

            // option 2
            rtmp: 'rtmp://s3b78u0kbtx79q.cloudfront.net/cfx/st'

        });

        $("#rtmpyplayer").flowplayer({
                swf: "video/flowplayer.swf",
                live: true,
                clip: {
                    url: 'mp4:video/sanmay.mp4',
                    live: true,
                    provider: 'rtmp'
                },
                plugins: {
                    rtmp: {
                        url: 'video/flowplayer.rtmp-3.2.13.swf',
                        netConnectionUrl: 'rtmp://s3b78u0kbtx79q.cloudfront.net/cfx/st'
                    }
                }
            }
        )
        ;
    };
}

AlertController.$inject = ['AlertService', 'CommonService', 'DeepStreamService', 'BindMessages'];
export default controllerModule.controller('AlertController', AlertController).name;