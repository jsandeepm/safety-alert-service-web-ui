import AlertService from './AlertService';
import controllerModule from '../common/ControllerModule';
import DeepStreamService from '../common/DeepStreamService';
import ModalController from './ModalController';
import _ from 'underscore';
import moment from 'moment';


class AlertController {
    constructor(AlertService, CommonService, DeepStreamService, toaster, _$interval_, _$timeout_, _$scope_, ModalService) {
        this.fullscreen = false;
        this.fullscreen = window.screenTop > 0;

        if (window.innerHeight == screen.height || screen.height - window.innerHeight <= 2) {
            this.fullscreen = true;
        }
        this.isImage = false;
        this.isFullScreen = false;
        // //console.log(window.screenTop);
        // //console.log(window.innerHeight);
        // //console.log(screen.height);
        // //console.log(this.fullscreen);

        this.toaster = toaster;
        this.yesNoMessage = "alert message";
        this.modalService = ModalService;
        this.interval = _$interval_;
        this.timeout = _$timeout_;
        this.scope = _$scope_;
        this.alertService = AlertService;
        this.commonService = CommonService;
        this.deepStreamService = DeepStreamService;
        this.i = 0;
        this.alertMessages = [];
        this.mappingIncidentIds = [];
        this.mapDetails = {};
        this.imageURL = [];
        this.uploadStreamList = [];
        this.multiple = {
            incidents: []
        };

        this.aaa = [{
            Id: 1,
            Name: 'Apple',
            Selected: false
        }, {
            Id: 2,
            Name: 'Mango',
            Selected: true
        }, {
            Id: 3,
            Name: 'Orange',
            Selected: false
        }];

        this.availableOptions = [
            {id: '1', name: 'new'},
            {id: '2', name: 'assigned'},
            {id: '3', name: 'delete'}
        ];
        this.rowClick = [];
        this.loadCameraFeed();
        this.loadsocialFeed();
        this.loadVideoCamera();
        this.loadsharing();
        angular.extend(this, {
            center: {
                lat: 12.97,
                lng: 77.56,
                zoom: 12
            },
            markers: this.mapDetails,
            layers: {
                baselayers: {
                    googleTerrain: {
                        name: 'Google Terrain',
                        layerType: 'TERRAIN',
                        type: 'google'
                    },
                    googleHybrid: {
                        name: 'Google Hybrid',
                        layerType: 'HYBRID',
                        type: 'google'
                    },
                    googleRoadmap: {
                        name: 'Google Streets',
                        layerType: 'ROADMAP',
                        type: 'google'
                    }
                },
                overlays: {
                    Fire: {
                        name: 'Fire',
                        type: 'group',
                        visible: true
                    },
                    Police: {
                        name: 'Police',
                        type: 'group',
                        visible: true
                    },
                    Medical: {
                        name: 'Medical',
                        type: 'group',
                        visible: true
                    },
                    Hazard: {
                        name: 'Hazard',
                        type: 'group',
                        visible: true
                    },
                    Accident: {
                        name: 'Accident',
                        type: 'group',
                        visible: true
                    }
                }
            }
        });
        this.connection = this.deepStreamService.getServerConnection();
        this.messagelist = this.connection.record.getList('safety/alerts');
        this.loadAlertsAsync();

    };

    showModal(i, option) {
        //console.log(i);
        //console.log(option);
        if (option.name.toLowerCase() === 'delete') {
            this.modalService.showModal({
                templateUrl: 'modalDeleteIncidents.html',
                controller: "ModalController as m",
                inputs: {
                    alertMessageList: [],
                    selectedImage: ''
                }
            }).then((modal)=> {
                modal.element.modal();
                modal.close.then((result)=> {
                    if (result.toLowerCase() === 'yes') {
                        var data = {
                            notificationType: i.notificationType,
                            status: 'delete',
                            id: i.alert.id,
                            alertType: i.alert.parentAlert[0].alertType
                        };

                        this.alertService.deleteIncidents(data).then((result) => {
                            //console.log(result);
                            if (result.data.message === "success") {
                                /*this.connection.record.getRecord(recordName).delete();
                                 this.messagelist.removeEntry(recordName);*/

                                this.alertMessageList = _.reject(this.alertMessageList, function (currentItem) {
                                    if (currentItem.notificationType === "incident" && (currentItem.alert.id === i.alert.id)) {
                                        //console.log(currentItem.alert.id, i.alert.id);
                                        //console.log(currentItem.alert.id === i.alert.id);
                                        /* this.connection.record.getRecord(currentItem.name).delete();
                                         this.messagelist.removeEntry(currentItem.name);*/
                                        return currentItem.alert.id === i.alert.id;
                                    }

                                });

                                /*this.uploadStreamListWithRTSP = _.reject(this.uploadStreamListWithRTSP, function (currentItem) {
                                 return currentItem.incidentId === i.alert.id;
                                 });*/
                                this.toaster.pop("success", "Successfully deleted the incident");
                            } else {
                                this.toaster.pop("error", "Error deleting incident");
                            }
                        });
                    }
                });
            });
        }
    }

    showImagesProfiles(alertMessageList, selectedImage) {
        //console.log("event occurred", alertMessageList);
        this.modalService.showModal({
            templateUrl: 'modalImagePopup.html',
            controller: "ModalController as m",
            inputs: {
                alertMessageList: alertMessageList,
                selectedImage: selectedImage
            }
        }).then((modal)=> {
            modal.element.modal();
            modal.close.then((result)=> {

            });
        });
    };

    toggleRowClick(i) {
        this.rowClick[i] = true;
    }

    loadAlertsAsync() {
        var offset = moment().utcOffset();
        //console.log(offset);
        this.alertMessageList = [];
        this.mapDetails = {};
        this.messagelist.subscribe((entries) => {
            this.alertMessages = entries.map((entry) => {
                var list = this.connection.record.getRecord(entry);
                list.subscribe((data) => {
                    //console.log("-----------------------------------------------------------------");
                    //console.log("Load alerts : notificationType :" + data.notificationType + " | id :" + data.id);
                    var incidentType = data.incidentType;
                    var recordName = list.name;
                    if (data.id) {
                        this.alertMessageList = _.reject(this.alertMessageList, function (currentItem) {
                            if (currentItem.id === data.id && currentItem.modifiedTime !== data.modifiedTime) {
                                //console.log("Load alerts : remove record message list : " + recordName);
                            }
                            return currentItem.id === data.id && currentItem.modifiedTime !== data.modifiedTime;
                        });
                        var incId = data.id.replace(/[^a-zA-Z0-9]/g, "");
                        if (data.notificationType !== 'incident') {
                            if (this.mapDetails[incidentType] === undefined) {
                                this.mapDetails[incidentType] = {};
                            }
                            this.mapDetails[incidentType][incId] = {
                                lat: data.location.latitude,
                                lng: data.location.longitude,
                                message: data.location.latitude + "," + data.location.longitude,
                                draggable: false,
                                icon: {
                                    iconUrl: '',
                                }
                            };
                            if (_.indexOf(this.mappingIncidentIds, incId) === -1) {
                                this.mappingIncidentIds.push(incId);
                            }
                            this.mapDetails[incidentType][incId].draggable = false;
                            this.mapDetails[incidentType][incId].icon.iconUrl = 'img/location-pointer.png';
                            this.mapDetails[incidentType][incId].icon.iconSize = [24, 24];
                            if (incidentType === 'Hazard') {
                                this.mapDetails[incidentType][incId].icon.iconUrl = 'img/hazard-location.png';
                            }
                            if (incidentType === 'Accident') {
                                this.mapDetails[incidentType][incId].icon.iconUrl = 'img/location-pointer.png';
                            }
                            if (incidentType === 'Fire') {
                                this.mapDetails[incidentType][incId].icon.iconUrl = 'img/fire-location.png';
                            }
                            if (incidentType === 'Police') {
                                this.mapDetails[incidentType][incId].icon.iconUrl = 'img/police-location.png';
                            }
                            if (incidentType === 'Medical') {
                                this.mapDetails[incidentType][incId].icon.iconUrl = 'img/medical-location.png';
                            }
                        }
                        else {
                            if (data.notificationType !== 'incident' && this.mapDetails[incidentType][incId] !== undefined) {
                                delete this.mapDetails[incidentType][incId];
                            }
                        }

                        if (data.notificationType === 'upload' || data.notificationType === 'stream') {
                            //console.log("Load alerts : Create UPLOAD/STREAM : " + data.notificationType + " | record name :" + recordName);
                            var uploadData = {
                                name: recordName,
                                notificationType: data.notificationType,
                                id: data.id,
                                url: data.url,
                                fileName: data.fileName,
                                user: {
                                    phoneNumber: data.user.phoneNumber,
                                    emailId: data.user.emailId,
                                    userName: data.user.userName
                                },
                                location: {
                                    latitude: data.location.latitude,
                                    longitude: data.location.longitude
                                },
                                status: data.status,
                                mediaType: data.mediaType,
                                incidentType: data.incidentType,
                                time: moment.utc(data.time).utcOffset(offset).format('YYYY-MM-DDTHH:mm:ss'),
                                modifiedTime: moment.utc(data.modifiedTime).utcOffset(offset).format('YYYY-MM-DDTHH:mm:ss'),
                                incidentId: data.incidentId
                            };
                            this.alertMessageList.push(uploadData);
                            //console.log("UPLOAD/STREAM alert added");
                        }
                        if (data.notificationType === 'call') {
                            //console.log("Load alerts : Create CALL :" + data.notificationType + " | record name :" + recordName);
                            var callData = {
                                name: recordName,
                                notificationType: data.notificationType,
                                id: data.id,
                                caller: {
                                    phoneNumber: data.caller.phoneNumber,
                                    emailId: data.caller.emailId,
                                    userName: data.caller.userName
                                },
                                callee: {
                                    phoneNumber: data.callee.phoneNumber,
                                    emailId: data.callee.emailId,
                                    userName: data.callee.userName
                                },
                                location: {
                                    latitude: data.location.latitude,
                                    longitude: data.location.longitude
                                },
                                status: data.status,
                                mediaType: data.mediaType,
                                incidentType: data.incidentType,
                                time: moment.utc(data.time).utcOffset(offset).format('YYYY-MM-DDTHH:mm:ss'),
                                modifiedTime: moment.utc(data.modifiedTime).utcOffset(offset).format('YYYY-MM-DDTHH:mm:ss'),
                                incidentId: data.incidentId
                            };
                            this.alertMessageList.push(callData);
                            //console.log("CALL alert added");
                        }
                    }
                    if (data.notificationType === 'incident') {
                        // //console.log("record name : " + recordName);
                        //console.log("Load alerts : Create incident " + data.notificationType + " | record name :" + recordName);
                        var parentAlerts = [];
                        var assignedToList = [];
                        var alertUsersList = [];
                        var mappedAlertList = [];
                        if (data.alert.parentAlert) {
                            for (var i in data.alert.parentAlert) {
                                //console.log(data.alert.parentAlert[i].alertType);
                                var singleAlert = {};
                                if (data.alert.parentAlert[i].alertType === 'call') {
                                    singleAlert = {
                                        alertId: data.alert.parentAlert[i].alertId,
                                        alertType: 'call',
                                        caller: {
                                            phoneNumber: data.alert.parentAlert[i].caller.phoneNumber,
                                            emailId: data.alert.parentAlert[i].caller.emailId,
                                            userName: data.alert.parentAlert[i].caller.userName
                                        },
                                        callee: {
                                            phoneNumber: data.alert.parentAlert[i].callee.phoneNumber,
                                            emailId: data.alert.parentAlert[i].callee.emailId,
                                            userName: data.alert.parentAlert[i].callee.userName
                                        },
                                        location: {
                                            latitude: data.alert.parentAlert[i].location.latitude,
                                            longitude: data.alert.parentAlert[i].location.longitude
                                        },
                                        incidentType: data.alert.parentAlert[i].incidentType
                                    };
                                } else {
                                    singleAlert = {
                                        alertId: data.alert.parentAlert[i].alertId,
                                        alertType: 'file',
                                        user: {
                                            phoneNumber: data.alert.parentAlert[i].user.phoneNumber,
                                            emailId: data.alert.parentAlert[i].user.emailId,
                                            userName: data.alert.parentAlert[i].user.userName
                                        },
                                        location: {
                                            latitude: data.alert.parentAlert[i].location.latitude,
                                            longitude: data.alert.parentAlert[i].location.longitude
                                        },
                                        incidentType: data.alert.parentAlert[i].incidentType
                                    };
                                }
                                parentAlerts.push(singleAlert);
                            }
                        }
                        if (data.alert.mappedAlerts) {
                            for (var i in data.alert.mappedAlerts) {
                                var singleAlert = {};
                                if (data.alert.parentAlert[i].alertType === 'call') {
                                    singleAlert = {
                                        alertId: data.alert.parentAlert[i].alertId,
                                        alertType: 'call',
                                        caller: {
                                            phoneNumber: data.alert.parentAlert[i].caller.phoneNumber,
                                            emailId: data.alert.parentAlert[i].caller.emailId,
                                            userName: data.alert.parentAlert[i].caller.userName
                                        },
                                        callee: {
                                            phoneNumber: data.alert.parentAlert[i].callee.phoneNumber,
                                            emailId: data.alert.parentAlert[i].callee.emailId,
                                            userName: data.alert.parentAlert[i].callee.userName
                                        },
                                        location: {
                                            latitude: data.alert.parentAlert[i].location.latitude,
                                            longitude: data.alert.parentAlert[i].location.longitude
                                        },
                                        incidentType: data.alert.parentAlert[i].incidentType
                                    };
                                } else {
                                    singleAlert = {
                                        alertId: data.alert.parentAlert[i].alertId,
                                        alertType: 'file',
                                        user: {
                                            phoneNumber: data.alert.parentAlert[i].user.phoneNumber,
                                            emailId: data.alert.parentAlert[i].user.emailId,
                                            userName: data.alert.parentAlert[i].user.userName
                                        },
                                        location: {
                                            latitude: data.alert.parentAlert[i].location.latitude,
                                            longitude: data.alert.parentAlert[i].location.longitude
                                        },
                                        incidentType: data.alert.parentAlert[i].incidentType
                                    };
                                }
                                mappedAlertList.push(singleAlert);
                            }
                        }
                        if (data.alert.assignedTo) {
                            for (var i in data.alert.assignedTo) {
                                var assign = {
                                    phoneNumber: data.alert.assignedTo[i].phoneNumber,
                                    emailId: data.alert.assignedTo[i].emailId,
                                    userName: data.alert.assignedTo[i].userName
                                };
                                assignedToList.push(assign);
                            }
                        }
                        if (data.alert.alertUsers) {
                            for (var i in data.alert.alertUsers) {
                                var user = {
                                    phoneNumber: data.alert.alertUsers[i].phoneNumber,
                                    emailId: data.alert.alertUsers[i].emailId,
                                    userName: data.alert.alertUsers[i].userName
                                };
                                alertUsersList.push(user);
                            }
                        }

                        var incidentData = {
                            notificationType: data.notificationType,
                            alert: {
                                id: data.alert.id,
                                time: moment.utc(data.alert.time).utcOffset(offset).format('YYYY-MM-DDTHH:mm:ss'),
                                modifiedTime: moment.utc(data.alert.modifiedTime).utcOffset(offset).format('YYYY-MM-DDTHH:mm:ss'),
                                name: data.alert.name,
                                parentAlert: parentAlerts,
                                mappedAlerts: data.alert.mappedAlerts,
                                createdBy: data.alert.createdBy,
                                description: data.alert.description,
                                status: data.alert.status,
                                assignedTo: assignedToList,
                                alertUsers: alertUsersList,
                                incidentType: data.alert.incidentType
                            }
                        };
                        this.alertMessageList.push(incidentData);
                    }
                    this.alertMessageList = _.sortBy(this.alertMessageList, 'modifiedTime').reverse();
                });
                return list;
            });

            angular.extend(this, {
                center: {
                    lat: 12.97,
                    lng: 77.56,
                    zoom: 12
                },
                markers: this.mapDetails,
                layers: {
                    baselayers: {
                        googleTerrain: {
                            name: 'Google Terrain',
                            layerType: 'TERRAIN',
                            type: 'google'
                        },
                        googleHybrid: {
                            name: 'Google Hybrid',
                            layerType: 'HYBRID',
                            type: 'google'
                        },
                        googleRoadmap: {
                            name: 'Google Streets',
                            layerType: 'ROADMAP',
                            type: 'google'
                        }
                    },
                    overlays: {
                        Fire: {
                            name: 'Fire',
                            type: 'group',
                            visible: true
                        },
                        Police: {
                            name: 'Police',
                            type: 'group',
                            visible: true
                        },
                        Medical: {
                            name: 'Medical',
                            type: 'group',
                            visible: true
                        },
                        Hazard: {
                            name: 'Hazard',
                            type: 'group',
                            visible: true
                        },
                        Accident: {
                            name: 'Accident',
                            type: 'group',
                            visible: true
                        }
                    }
                }
            });
        });
    };

    deleteRecordFromList(recordName, id, alertType) {
        var alertData = {};
        if (alertType === 'upload' || alertType === 'stream') {
            alertData = {
                notificationType: alertType,
                id: id,
                url: '',
                fileName: '',
                user: {
                    phoneNumber: '',
                    emailId: '',
                    userName: ''
                },
                location: {
                    latitude: '',
                    longitude: ''
                },
                status: 'delete',
                mediaType: '',
                incidentType: '',
                time: '',
                incidentId: ''
            }
        }
        if (alertType === 'call') {
            alertData = {
                notificationType: alertType,
                id: id,
                caller: {
                    phoneNumber: '',
                    emailId: '',
                    userName: ''
                },
                callee: {
                    phoneNumber: '',
                    emailId: '',
                    userName: ''
                },
                location: {
                    latitude: '',
                    longitude: ''
                },
                status: "delete",
                mediaType: '',
                incidentType: '',
                time: '',
                incidentId: ''
            }
        }
        //console.log("Alert Delete service request body : ", alertData);
        this.alertService.deleteRecordFromDB(alertData).then((result) => {
            //console.log("Alert Delete service response body : ", result.data.message);
            //console.log(result);
            if (result.data.message === "success") {
                var incId = id.replace(/[^a-zA-Z0-9]/g, "");
                delete this.mapDetails[incId];
                //console.log("Delete alert : mapDetails marker details :", this.mapDetails);
                this.connection.record.getRecord(recordName).delete();
                this.messagelist.removeEntry(recordName);
                this.alertMessageList = _.reject(this.alertMessageList, function (currentItem) {
                    if (currentItem.id === id) {
                        //console.log("Delete alert : recordName : " + recordName);
                    }
                    return currentItem.id === id;
                });
                this.uploadStreamListWithRTSP = _.reject(this.uploadStreamListWithRTSP, function (currentItem) {
                    if (currentItem.id === id) {
                        //console.log("Delete alert : recordName : " + recordName);
                    }
                    return currentItem.id === id;
                });
                this.playSelectVideoOrImage(this.uploadStreamListWithRTSP[0].url, this.uploadStreamListWithRTSP[0].mediaType);
                this.toaster.pop("success", "Successfully deleted the alert");
            } else {
                this.toaster.pop("error", "Alert already mapped to incident. Please delete incident to delete alert");
            }
            this.scope.$apply();
        });

        // this.deleteAbsoluteRecords();
    }

    saveMappedIncidents(recordName, incidentId, id, notificationType) {
        //console.log("Link incident : " + id + " type:" + notificationType + " and recordName :" + recordName);
        var alert = {};
        if (notificationType === 'call') {
            alert = {
                id: '',
                time: moment.utc().format('YYYY-MM-DDTHH:mm:ss'),
                modifiedTime: moment.utc().format('YYYY-MM-DDTHH:mm:ss'),
                parentAlert: [
                    {
                        alertType: 'call',
                        alertId: id
                    }
                ]
            }
        } else {
            alert = {
                id: '',
                time: moment.utc().format('YYYY-MM-DDTHH:mm:ss'),
                modifiedTime: moment.utc().format('YYYY-MM-DDTHH:mm:ss'),
                parentAlert: [
                    {
                        alertType: 'file',
                        alertId: id
                    }
                ]
            }
        }
        //console.log("Link alerts request body : ", alert);
        this.alertService.saveMappedIncidents(alert).then((result) => {
            //console.log("Link alerts response body : ", result);
            if (result.data.message === 'success') {
                this.connection.record.getRecord(recordName).delete();
                this.messagelist.removeEntry(recordName);
                this.alertMessageList = _.reject(this.alertMessageList, function (currentItem) {
                    if (currentItem.id === id) {
                        //console.log("Delete Linked alert : recordName : " + recordName);
                    }
                    return currentItem.id === id;
                });
                this.toaster.pop("success", "Incident created")
            } else {
                this.toaster.pop("error", "Error while creating incident created : " + id);
            }
        })
    }

    loadAsyncMobileVideos() {
        this.messagelist.subscribe((entries) => {
            var messages = entries.map((entry) => {
                var list = this.connection.record.getRecord(entry);
                list.subscribe((data) => {
                    //console.log("-----------------------------------------------------------------");
                    //console.log("UPLOAD STREAM LIST : notificationType :" + data.notificationType + " | id :" + data.id);
                    var incidentType = data.incidentType;
                    var recordName = list.name;
                    if (data.id) {
                        this.uploadStreamList = _.reject(this.uploadStreamList, function (currentItem) {
                            if (currentItem.id === data.id) {
                                //console.log("UPLOAD STREAM LIST : remove record message list : " + recordName);
                            }
                            return currentItem.id === data.id;
                        });
                        this.uploadStreamListWithRTSP = _.reject(this.uploadStreamListWithRTSP, function (currentItem) {
                            if (currentItem.id === data.id) {
                                //console.log("UPLOAD STREAM LIST : remove record message list : " + recordName);
                            }
                            return currentItem.id === data.id;
                        });
                        if (data.notificationType === 'upload' || data.notificationType === 'stream') {
                            //console.log("UPLOAD STREAM LIST : Create UPLOAD/STREAM : " + data.notificationType + " | record name :" + recordName);
                            if (data.mediaType.indexOf("image") !== -1 || data.mediaType.indexOf("jpeg") !== -1
                                || data.mediaType.indexOf("video") !== -1 || data.mediaType.indexOf("streaming") !== -1
                                && data.modifiedTime !== undefined && !(data.url.indexOf("rtsp") >= 0)) {
                                var uploadData = {
                                    id: data.id,
                                    url: data.url,
                                    fileName: data.fileName,
                                    phoneNumber: data.user.phoneNumber,
                                    mediaType: data.mediaType,
                                    incidentType: data.incidentType,
                                    time: data.time,
                                    modifiedTime: data.modifiedTime
                                };
                                this.uploadStreamList.push(uploadData);
                                //console.log("UPLOAD STREAM added");
                            }
                            if (data.mediaType.indexOf("image") !== -1 || data.mediaType.indexOf("jpeg") !== -1
                                || data.mediaType.indexOf("video") !== -1 || data.mediaType.indexOf("streaming") !== -1
                                && data.modifiedTime !== undefined) {
                                var uploadData = {
                                    id: data.id,
                                    url: data.url,
                                    fileName: data.fileName,
                                    phoneNumber: data.user.phoneNumber,
                                    mediaType: data.mediaType,
                                    incidentType: data.incidentType,
                                    time: data.time,
                                    modifiedTime: data.modifiedTime
                                };
                                this.uploadStreamListWithRTSP.push(uploadData);
                                //console.log("UPLOAD STREAM added");
                            }
                        }
                    }
                    this.uploadStreamList = _.sortBy(this.uploadStreamList, 'modifiedTime').reverse();
                    this.uploadStreamListWithRTSP = _.sortBy(this.uploadStreamListWithRTSP, 'modifiedTime').reverse();
                    if (this.uploadStreamListWithRTSP.length >= 0) {
                        this.playSelectVideoOrImage(this.uploadStreamListWithRTSP[0].url, this.uploadStreamListWithRTSP[0].mediaType);
                    }
                    this.updateViewOnTimeInterval(this.uploadStreamList);
                    // var n = 5;
                    //console.log("333333333333333333333333333333333333333");
                    // var lists = _.groupBy(this.uploadStreamList, function (element, index) {
                    //     return Math.floor(index / n);
                    // });
                    //console.log(lists);
                    // _.forEach(lists, (uploadStreamList, id)=>{
                    // window.setTimeout(()=> {
                    // this.updateViewOnTimeInterval(this.uploadStreamList);
                    //console.log(new Date().getMinutes());
                    // }, 5000);
                    // });

                });
                return list;
            });
        });
        /*this.interval(() => {
         var n = 4;
         var lists = _.groupBy(this.uploadStreamList, function (element, index) {
         return Math.floor(index / n);
         });
         if (this.i >= Math.floor(this.uploadStreamList.length / 5)) {
         this.i = 0;
         }
         this.i++;
         // //console.log("this.i");
         // //console.log(this.i);
         /!*if (this.i == 1) {
         // //console.log("lists[0][0].url, lists[0][0].mediaType");
         //console.log(this.uploadStreamListWithRTSP[0].url, this.uploadStreamListWithRTSP[0].mediaType);
         this.playSelectVideoOrImage(this.uploadStreamListWithRTSP[0].url, this.uploadStreamListWithRTSP[0].mediaType);
         }*!/
         this.updateViewOnTimeInterval(lists[this.i]);
         }, 30000);*/


    };

    updateViewOnTimeInterval(uploadStreamList) {
        // //console.log("=================================================================:" + this.i);
        // //console.log("this.uploadStreamList");
        // //console.log(uploadStreamList.length);
        this.imageURL = [];
        _.each(uploadStreamList, (value, id) => {

            var elementById = document.getElementById("flowplayer" + id);
            if (elementById) {
                document.getElementById("mbVideos" + id).removeChild(elementById);
            }
            /*var loadingTextId = document.getElementById("loadingTextId");
             if (loadingTextId) {
             document.getElementById("mbVideos").removeChild(loadingTextId);
             }*/
        });

        var urlArray = [];
        _.each(uploadStreamList, (value, id) => {
            if (id >= 1 && id <= 4) {
                //console.log("LOOPING : ", id);
                if (value.mediaType.indexOf("streaming") !== -1 || value.mediaType.indexOf("video") !== -1) {
                    var URL = value.url.replace("rtsp", "rtmp"); //rtmp://54.169.237.13:1935/live/
                    //console.log(URL, value.fileName);
                    if (!_.contains(urlArray, URL)) {
                        var vidDiv = document.createElement('div');
                        vidDiv.setAttribute("id", "flowplayer" + id);
                        vidDiv.setAttribute("style", "padding: 0px!important");
                        // vidDiv.className = 'channel1';
                        //console.log("element : ", vidDiv);
                        document.getElementById('mbVideos' + id).appendChild(vidDiv);
                        if (value.mediaType.indexOf("streaming") !== -1) {
                            flowplayer(vidDiv, {
                                volume: 0.0,
                                hlsjs: true,
                                live: true,
                                autoplay: true,
                                share: false,
                                splash: false,
                                ratio: 9 / 16,
                                swf: "video/flowplayer.swf",
                                rtmp: URL,
                                playlist: [[{
                                    flash: value.fileName
                                }]]
                            });
                        }
                        if (value.mediaType.indexOf("video") !== -1) {
                            //console.log("----------------------------", value.url);
                            flowplayer(vidDiv, {
                                volume: 0.0,
                                swf: "video/flowplayer.swf",
                                autoplay: true,
                                loop: true,
                                share: false,
                                splash: false,
                                hlsjs: true,
                                ratio: 9 / 16,
                                clip: {
                                    sources: [
                                        {
                                            type: "video/mp4", src: value.url
                                        }
                                    ]
                                }
                            });
                        }
                        urlArray.push(URL);
                    }
                    // type: "video/mp4", src: "video/sanmay.mp4"}
                } else {
                    var imgDiv = document.createElement('div');
                    imgDiv.setAttribute("id", "flowplayer" + id);
                    // imgDiv.setAttribute("style", "padding: 0px!important");
                    imgDiv.className = 'stretchy-wrapper';
                    var imgTag = document.createElement('img');
                    imgTag.setAttribute('src', value.url);
                    // imgTag.setAttribute("style", "width: inherit;height: inherit");
                    imgDiv.appendChild(imgTag);
                    //console.log("element : ", imgDiv);
                    document.getElementById('mbVideos' + id).appendChild(imgDiv);
                }
            }
        });

        this.timeout(() => {
            var flowplayer1 = angular.element(document.querySelector('#flowplayer1 > a'));
            var flowplayer2 = angular.element(document.querySelector('#flowplayer2 > a'));
            var flowplayer3 = angular.element(document.querySelector('#flowplayer3 > a'));
            var flowplayer4 = angular.element(document.querySelector('#flowplayer4 > a'));
            var sharing1 = angular.element(document.querySelector('#sharing1 > a'));
            var sharing2 = angular.element(document.querySelector('#sharing2 > a'));
            var sharing3 = angular.element(document.querySelector('#sharing3 > a'));
            var sharing4 = angular.element(document.querySelector('#sharing4 > a'));
            var CameraFeed1 = angular.element(document.querySelector('#CameraFeed1 > a'));
            var CameraFeed2 = angular.element(document.querySelector('#CameraFeed2 > a'));
            var CameraFeed3 = angular.element(document.querySelector('#CameraFeed3 > a'));
            var CameraFeed4 = angular.element(document.querySelector('#CameraFeed4 > a'));
            var socialFeed1 = angular.element(document.querySelector('#socialFeed1 > a'));
            var socialFeed3 = angular.element(document.querySelector('#socialFeed3 > a'));
            var VideoCamera1 = angular.element(document.querySelector('#VideoCamera1 > a'));
            flowplayer1.remove();
            flowplayer2.remove();
            flowplayer3.remove();
            flowplayer4.remove();
            sharing1.remove();
            sharing2.remove();
            sharing3.remove();
            sharing4.remove();
            CameraFeed1.remove();
            CameraFeed2.remove();
            CameraFeed3.remove();
            CameraFeed4.remove();
            socialFeed1.remove();
            socialFeed3.remove();
            sharing3.remove();
            VideoCamera1.remove();
        }, 10000);
    }

    loadCameraFeed() {
        flowplayer("#CameraFeed1", {
            volume: 0.0,
            swf: "video/flowplayer.swf",
            autoplay: true,
            share: false,
            splash: false,
            loop: true,
            ratio: 9 / 16,
            hlsjs: true,
            clip: {
                sources: [
                    {
                        type: "video/mp4",
                        src: "https://s3-us-west-2.amazonaws.com/www.ciclopstech.com/Camera Feed 1 - Liverpool  Shopping.mp4"
                    }
                ]
            }
        });

        flowplayer("#CameraFeed2", {
            volume: 0.0,
            swf: "video/flowplayer.swf",
            autoplay: true,
            share: false,
            splash: false,
            loop: true,
            ratio: 9 / 16,
            hlsjs: true,
            clip: {
                sources: [
                    {
                        type: "video/mp4",
                        src: "https://s3-us-west-2.amazonaws.com/www.ciclopstech.com/Camera Feed 2 - Highway Car Video.mp4"
                    }
                ]
            }
        });

        flowplayer("#CameraFeed3", {
            volume: 0.0,
            swf: "video/flowplayer.swf",
            autoplay: true,
            share: false,
            splash: false,
            loop: true,
            ratio: 9 / 16,
            hlsjs: true,
            clip: {
                sources: [
                    {
                        type: "video/mp4",
                        src: "https://s3-us-west-2.amazonaws.com/www.ciclopstech.com/Camera Feed 3 - Drone  Forest Fire.mp4"
                    }
                ]
            }
        });

        flowplayer("#CameraFeed4", {
            volume: 0.0,
            swf: "video/flowplayer.swf",
            autoplay: true,
            share: false,
            splash: false,
            loop: true,
            ratio: 9 / 16,
            hlsjs: true,
            clip: {
                sources: [
                    {
                        type: "video/mp4",
                        src: "https://s3-us-west-2.amazonaws.com/www.ciclopstech.com/Camera Feed 4 - News Video.mp4"
                    }
                ]
            }
        });
    }

    loadsocialFeed() {
        flowplayer("#socialFeed1", {
            volume: 0.0,
            swf: "video/flowplayer.swf",
            autoplay: true,
            loop: true,
            share: false,
            splash: false,
            ratio: 9 / 16,
            hlsjs: true,
            clip: {
                sources: [
                    {
                        type: "video/mp4",
                        src: "https://s3-us-west-2.amazonaws.com/www.ciclopstech.com/Social Feed 1 - Facebook Screen Video.mp4"
                    }
                ]
            }
        });
        flowplayer("#socialFeed3", {
            volume: 0.0,
            swf: "video/flowplayer.swf",
            autoplay: true,
            loop: true,
            share: false,
            splash: false,
            ratio: 9 / 16,
            hlsjs: true,
            clip: {
                sources: [
                    {
                        type: "video/mp4",
                        src: "https://s3-us-west-2.amazonaws.com/www.ciclopstech.com/Social Feed 3 - YouTube Screen Video.mp4"
                    }
                ]
            }
        });
    }

    loadVideoCamera() {
        flowplayer("#VideoCamera1", {
            volume: 0.0,
            swf: "video/flowplayer.swf",
            autoplay: true,
            loop: true,
            share: false,
            splash: false,
            ratio: 9 / 16,
            hlsjs: true,
            clip: {
                sources: [
                    {
                        type: "video/mp4",
                        src: "https://s3-us-west-2.amazonaws.com/www.ciclopstech.com/Meeting Video Feed.mp4"
                    }
                ]
            }
        });
    }

    loadsharing() {
        flowplayer("#sharing1", {
            volume: 0.0,
            swf: "video/flowplayer.swf",
            autoplay: true,
            loop: true,
            share: false,
            splash: false,
            ratio: 9 / 16,
            hlsjs: true,
            clip: {
                sources: [
                    {
                        type: "video/mp4",
                        src: "https://s3-us-west-2.amazonaws.com/www.ciclopstech.com/Mobile Feed - Bus Stop.mp4"
                    }
                ]
            }
        });
        flowplayer("#sharing2", {
            volume: 0.0,
            swf: "video/flowplayer.swf",
            autoplay: true,
            loop: true,
            share: false,
            splash: false,
            ratio: 9 / 16,
            hlsjs: true,
            clip: {
                sources: [
                    {
                        type: "video/mp4",
                        src: "https://s3-us-west-2.amazonaws.com/www.ciclopstech.com/Mobile Feed - Car Theft.mp4"
                    }
                ]
            }
        });
        flowplayer("#sharing3", {
            volume: 0.0,
            swf: "video/flowplayer.swf",
            autoplay: true,
            loop: true,
            share: false,
            splash: false,
            ratio: 9 / 16,
            hlsjs: true,
            clip: {
                sources: [
                    {
                        type: "video/mp4",
                        src: "https://s3-us-west-2.amazonaws.com/www.ciclopstech.com/Social Feed 1 - Facebook Screen Video.mp4"
                    }
                ]
            }
        });
        flowplayer("#sharing4", {
            volume: 0.0,
            swf: "video/flowplayer.swf",
            autoplay: true,
            loop: true,
            share: false,
            splash: false,
            ratio: 9 / 16,
            hlsjs: true,
            clip: {
                sources: [
                    {
                        type: "video/mp4",
                        src: "https://s3-us-west-2.amazonaws.com/www.ciclopstech.com/Camera Feed 3 - Drone  Forest Fire.mp4"
                    }
                ]
            }
        });
    }

    setSelectVideoAndMap(latitude, longitude, url, mediaType) {
        // //console.log(latitude, longitude);
        // //console.log(url);
        // //console.log(mediaType);
        this.setLocationCenter(latitude, longitude);
        this.playSelectVideoOrImage(url, mediaType);
    }

    setLocationCenter(lat, long) {
        //console.log(lat, ",", long);
        angular.extend(this, {
            center: {
                lat: lat,
                lng: long,
                zoom: 12
            }
        })
    }

    playSelectVideoOrImage(url, type) {
        this.isImage = false;
        //console.log(url);
        //console.log(type);
        //console.log("LOOPING : ", id);
        var elementById = document.getElementById("flowPlayerDefault");
        if (elementById) {
            document.getElementById("mbVideosOne").removeChild(elementById);
        }
        var loadingTextId = document.getElementById("loadingTextIdOne");
        if (loadingTextId) {
            document.getElementById("mbVideosOne").removeChild(loadingTextId);
        }
        if (type.indexOf("streaming") !== -1 || type.indexOf("video") !== -1 || type.indexOf("audio") !== -1) {
            var URL = url.replace("rtsp", "rtmp"); //rtmp://54.169.237.13:1935/live/
            //console.log(URL, value.fileName);
            var vidDiv = document.createElement('div');
            vidDiv.setAttribute("id", "flowPlayerDefault");
            vidDiv.setAttribute("style", "padding: 0px!important");
            vidDiv.className = 'col-md-12';
            //console.log("element : ", vidDiv);
            document.getElementById('mbVideosOne').appendChild(vidDiv);
            if (type.indexOf("streaming") !== -1) {
                flowplayer(vidDiv, {
                    hlsjs: true,
                    live: true,
                    autoplay: true,
                    loop: true,
                    share: false,
                    splash: false,
                    ratio: 9 / 16,
                    swf: "video/flowplayer.swf",
                    rtmp: URL,
                    playlist: [[{
                        flash: url
                    }]]
                });
            }
            if (type.indexOf("video") !== -1) {
                //console.log("----------------------------", url);
                flowplayer(vidDiv, {
                    volume: 0.0,
                    swf: "video/flowplayer.swf",
                    autoplay: true,
                    loop: true,
                    share: false,
                    splash: false,
                    hlsjs: true,
                    ratio: 9 / 16,
                    clip: {
                        sources: [
                            {
                                type: "video/mp4", src: url
                            }
                        ]
                    }
                });
            }
            if (type.indexOf("audio") !== -1) {
                vidDiv.className = 'col-md-12 is-audio';
                flowplayer(vidDiv, {
                    ratio: 9 / 16,
                    volume: 1.0,
                    autoplay: true,
                    splash: true,
                    swf: "video/flowplayer.audio-3.2.11.swf",
                    playlist: [{
                        audio: true,
                        autoplay: true,
                        sources: [
                            {type: "audio/mpeg", src: url}
                        ]
                    }]
                });
            }
            // type: "video/mp4", src: "video/sanmay.mp4"}
        } else {
            this.isImage = true;
            this.imageURLSelected = url;
            // this.selecteImage = url;
            /* var imgDiv = document.createElement('div');
             imgDiv.setAttribute("id", "flowPlayerDefault");
             // imgDiv.setAttribute("style", "padding: 0px!important");
             imgDiv.className = 'col-md-12 stretchy-wrapper-big';
             var imgTag = document.createElement('img');
             imgTag.setAttribute('src', url);
             // imgTag.setAttribute("style", "width: inherit;height: inherit");
             imgDiv.appendChild(imgTag);*/
            //console.log("element : ", imgDiv);
            // document.getElementById('mbVideosOne').appendChild(imgDiv);
            var element = angular.element(document.querySelector('#mbVideosOne'));

            element.append("<div id='flowPlayerDefault' class='col-md-12 stretchy-wrapper-big'><img src='" + url + "'></div>");
        }

        var flowPlayerDefault = angular.element(document.querySelector('#flowPlayerDefault > a'));
        flowPlayerDefault.remove();
    }

    setIncidentId(incidentId, id, notificationType) {
        this.selectIncidentId = incidentId;
        this.selectNotificationType = notificationType;
        //console.log(this.selectIncidentId);
        //console.log(this.selectNotificationType);
        this.mappingIncidentIdsWithoutParent = _.without(this.mappingIncidentIds, incidentId);
        this.multiple = {
            incidents: []
        };
    }

    deleteAbsoluteRecords() {
        /*   var incId = id.replace(/[^a-zA-Z0-9]/g, "");
         delete this.mapDetails[incId];
         //console.log(this.mapDetails);
         //console.log("recordName : " + recordName);
         this.connection.record.getRecord(recordName).delete();
         this.messagelist.removeEntry(recordName);
         this.toaster.pop("success", id + " deleted");*/

        var oldRecords = [
            'alerts/j38pqt3f-1c555dc4ttu',
            'alerts/ j38pqt3f-1c555dc4ttu'
        ];
        for (var i in oldRecords) {
            //console.log(oldRecords[i]);
            this.connection.record.getRecord(oldRecords[i]).delete();
            // this.messagelist.removeEntry(oldRecords[i]);
        }
    }
}

AlertController.$inject = ['AlertService', 'CommonService', 'DeepStreamService', 'toaster', '$interval', '$timeout', '$scope', 'ModalService'];
export default controllerModule.controller('AlertController', AlertController).name;