import AlertService from './AlertService';
import controllerModule from '../common/ControllerModule';
import DeepStreamService from '../common/DeepStreamService';
import _ from 'underscore';

class AlertController {
    constructor(AlertService, CommonService, DeepStreamService) {
        this.alertService = AlertService;
        this.commonService = CommonService;
        this.deepStreamService = DeepStreamService;
        this.alertMessages = [];
        this.mapDetails = {};
        this.mainMarker = {
            lat: 13.0601709,
            lang: 77.56245290000001,
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
        this.messagelist = this.connection.record.getList('safety/alerts');
        angular.extend(this, {
            london: {
                lat: 12.972169,
                lng: 77.590606,
                zoom: 11
            },
            markers: this.mapDetails
        });
        this.loadAlertsAsync();
        this.loadAsyncMobileVideos();
        console.log();
    };

    loadAlertsAsync() {
        this.messagelist.subscribe((entries)=> {
            this.mapDetails = {};
            this.alertMessages = entries.map((entry)=> {
                var list = this.connection.record.getRecord(entry);
                list.subscribe((data) => {
                    console.log(data);
                    this.mapDetails[data.incidentId] = {
                        lat: data.location.latitude,
                        lng: data.location.longitude,
                        message: "I am : " + data.id,
                        draggable: true,
                        icon: {
                            iconUrl: 'img/location-pointer.png',
                        }
                    };
                    console.log(this.mapDetails[data.incidentId]);
                });
                return list;
            });

            angular.extend(this, {
                london: {
                    lat: 12.972169,
                    lng: 77.590606,
                    zoom: 11
                },
                markers: this.mapDetails
            });

        });
    };

    deleteRecordFromList(recordName) {
        this.messagelist.removeEntry(recordName);
        this.connection.record.getRecord(recordName).delete();
    }

    addRecordToList(alertRecord) {

    }

    loadAsyncMobileVideos() {
        console.log("flowplayer");

        this.url = "rtmp://192.168.1.103:1935/Sandeep-live-demo";
        this.file = "myStream";
        $("#flowplayer1").flowplayer({
            live: true,
            swf: "video/flowplayer.swf",
            rtmp: this.url,
            playlist: [[{
                flash: this.file
            }]]
        });

        $("#flowplayer2").flowplayer({
            live: true,
            swf: "video/flowplayer.swf",
            rtmp: this.url,
            playlist: [[{
                flash: this.file
            }]]
        });

        $("#flowplayer3").flowplayer({
            live: true,
            swf: "video/flowplayer.swf",
            rtmp: this.url,
            playlist: [[{
                flash: this.file
            }]]
        });

        // Surv--Camera
        $("#surveillanceCamera1").flowplayer({
            live: true,
            swf: "video/flowplayer.swf",
            rtmp: this.url,
            playlist: [[{
                flash: this.file
            }]]
        });

        $("#surveillanceCamera2").flowplayer({
            live: true,
            swf: "video/flowplayer.swf",
            rtmp: this.url,
            playlist: [[{
                flash: this.file
            }]]
        });

        $("#surveillanceCamera3").flowplayer({
            live: true,
            swf: "video/flowplayer.swf",
            rtmp: this.url,
            playlist: [[{
                flash: this.file
            }]]
        });


    };
}

AlertController.$inject = ['AlertService', 'CommonService', 'DeepStreamService'];
export default controllerModule.controller('AlertController', AlertController).name;