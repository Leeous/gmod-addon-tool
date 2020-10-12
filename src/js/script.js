// Global Variables
const {
    remote,
    ipcRenderer,
    files
} = require("electron");
const settings = require("electron-settings");
const shell = require("electron").shell;
const imageSize = require("image-size");
const { event } = require("jquery");
const { dialog } = require("electron").remote;
let win = remote.getCurrentWindow();
addon_data = [];
api_data = {"itemcount": "0"};
okToProcessAddonList = false;
donePopulatingAddonList = false;
currentAppVersion = "v2.1";

// These are addon related variables, most are reset on completion/fail/abort
currentNewAddon = "";
jsonCheckboxCount = 0;
jsonChecks = [false, false];
apiError = 0;
addonGMADir = "";
existingAddonId = null;
let addonTitle;
let addonTags;
let addonType;
addonIcon = ""; // Directory of current addon's icon
addonToCreateData = {
    "title": "",
    "type": "",
    "tags": [],
    "ignore": []
};
let onlyCreate = null; // This tells us if the user is only wanting to create a GMA


// Dialog properties
let dirDialogOptions = {
    title : "Select your addon's folder",
    buttonLabel : "Select Folder",
    filters :[
     {name: "All Folders", extensions: ["*"]}
    ],
    properties: ["openDirectory"]
};

let imgDialogOptions = {
    title : "Select your addon's icon", 
    buttonLabel : "Select icon",
    filters :[
     {name: "Image", extensions: ["jpeg", "jpg"]}
    ],
    properties: ["openFile"]
};

let fileDialogOptions = {
    title : "Select your GMA file", 
    buttonLabel : "Select GMA",
    filters :[
     {name: "Garry\"s Mod Addon File", extensions: ["gma"]}
    ],
    properties: ["openFile"]
};


window.addEventListener("DOMContentLoaded", (e) => {
    let transButtons = document.querySelectorAll(".transition_button");

    // If user has already defined their Garrysmod directory, just skip ahead to #addon_management
    if (settings.get("gmodDirectory") != null) {
        $("#addon_management").fadeIn();
        $("#addon_management_prompt").fadeIn();
        if (win.getBounds().height == 225) {
            win.setBounds({
                height: 200
            });
        }
        ipcRenderer.send("getAddonInfo");
    } else {
        $("#directory_selection").fadeIn();
    }

    // ==============
    // Event handlers
    // ==============

    // App Controls
    document.getElementById("closeApp").addEventListener("click", () => {
        window.close();
    });

    document.getElementById("minApp").addEventListener("click", () => {
        remote.getCurrentWindow().minimize();
    });

    document.getElementById("coffeeApp").addEventListener("click", () => {
        shell.openExternal("https://www.buymeacoffee.com/Leeous");
    });

    document.getElementById("settingsModal").addEventListener("click", () => {
        ipcRenderer.send("openSettings");
    });

    // Validate that we have read/write access to the users Garrysmod directory so we can use gmad & gmpublish
    document.getElementById("gmod_dir_folder").addEventListener("click", () => {
        dialog.showOpenDialog(win, dirDialogOptions).then(result => {
        var filePath = result.filePaths[0]
        var desName = filePath.substring(filePath.length - 9, filePath.length);
        if (filePath != null) {
            ipcRenderer.send("checkIfDirectoryExists", filePath + "/bin/gmad.exe");
            ipcRenderer.send("checkIfDirectoryExists", filePath + "/bin/gmpublish.exe");
            if (desName == "GarrysMod") {
                $("#status_of_dir").css("color", "lightgreen");
                $("#status_of_dir").text("Found gmad.exe and gmpublish.exe!");
                $("#dir_prompt_next button").css("background-color", "#56bd56");
                $("#dir_prompt_next button").prop("disabled", false);
                $("#dir_prompt_next button").css("cursor", "pointer");
                $("#checkmarkNote").fadeIn(() => {
                    $("#checkmarkNote").delay(1000).fadeOut();
                })
                settings.set("gmodDirectory", filePath);
                ipcRenderer.send("getAddonInfo");
            } else {
                $("#status_of_dir").css("color", "red");
                $("#status_of_dir").text("Can't find gmad.exe or gmpublish.exe!");
                console.log(filePath);
                $("#dir_prompt_next button").prop("disabled", true);
                $("#dir_prompt_next button").css("cursor", "not-allowed");
            }
        }
        }).catch(err => {
            console.log("dialog error")
        });
    });

    document.getElementById("gmaLocation").addEventListener("click", () => {
        shell.openItem(addonGMADir.substring(0, addonGMADir.lastIndexOf("/")));
    });
    
    // Let user select a GMA to extract
    document.getElementById("gmaFileSelection").addEventListener("click", () => {
        dialog.showOpenDialog(win, fileDialogOptions).then(r => {
            let addonGMA = r.filePaths[0];
            addonPath = r.filePaths[0];
            if (addonGMA != null) {
                ipcRenderer.send("checkIfDirectoryExists", addonGMA);
                var n = addonGMA.lastIndexOf("\\");
                var result = addonGMA.substring(n + 1, addonGMA.length);
                $("#currentGMAFile").text(result);
                $("#addon_extract_next button").prop("disabled", false);
                $("#addon_extract_next button").css("background-color", "#56bd56");
                $("#addon_extract_next button").css("cursor", "pointer");  
            }
        }).catch(err => {});
    });
    
    document.querySelector("#addon_extract_next button").addEventListener("click", () => {
        $("#extract_addon_select").fadeOut(() => {
            $("#extracting_addon").fadeIn(() => {
                ipcRenderer.send("extractAddon", addonPath);
            });
        });
    });

    document.getElementById("extractedGMALocation").addEventListener("click", () => {
        shell.openItem(addonPath.substring(0, addonPath.length - 4));
    });

    // If directory exists (and is writable/readable) allow user to procede 
    document.getElementById("addon_dir_folder").addEventListener("click", () => {
        dialog.showOpenDialog(win, dirDialogOptions).then(result => {
            if (!result.canceled) {
                currentNewAddon = result.filePaths[0];
                if (currentNewAddon != null) {
                    ipcRenderer.send("checkIfDirectoryExists", currentNewAddon);
                    var n = currentNewAddon.lastIndexOf("\\");
                    console.log(n);
                    var result = currentNewAddon.substring(n + 1);
                    $("#addonDir b").text(result);
                    $("#addonDirCheck").css("background-color", "#56bd56");
                    $("#addonDirCheck").prop("disabled", false);
                    $("#addonDirCheck").css("cursor", "pointer");
                }
            }
        }).catch(err => {
            console.log("dialog error");
        })
    });

    // Prompts user for an icon for their addon
    document.getElementById("addon_icon").addEventListener("click", () => {
        dialog.showOpenDialog(win, imgDialogOptions).then(result => {
            addonIcon = result.filePaths[0];
            if (addonIcon != null) {
                ipcRenderer.send("checkIfDirectoryExists", addonIcon);
            }
            var jpegCheck = addonIcon.substring(addonIcon.length - 4);
            var sizeOf = require("image-size");
            var dimensions = sizeOf(addonIcon);
            if (jpegCheck == "jpeg" || jpegCheck == ".jpg") {
                if (dimensions.height == 512 && dimensions.width == 512) {
                    $("#addonIconCheck").css("background-color", "#56bd56");
                    $("#addonIconCheck").prop("disabled", false);
                    $("#addonIconCheck").css("cursor", "pointer");
                    $("#gmaPrep div img").attr("src", addonIcon);
                } else {
                    alert("Image must be 512x512.");
                }
            } else {
                $("#addonIconCheck").css("background-color", "#0261A5");
                $("#addonIconCheck").prop("disabled", true);
                $("#addonIconCheck").css("cursor", "not-allowed");
                alert("Doesn't seem like a JPEG image.");
            }
        }).catch(err => {
            console.error("Dailog failed to open!");
        });
    });

    document.querySelector(".resetAddonCreation").addEventListener("click", (() => {
        resetAddonCreation();
    }));

    document.getElementById("update_existing_addon_button").addEventListener("click", () => {
        if (okToProcessAddonList) {
            populateAddonList(addon_data);
            $("#addon_management_prompt").fadeOut(() => {
                win.setBounds({height: 250})
                $("#update_existing_addon").fadeIn();
            })
        }
    });
    
    transButtons.forEach((element) => {
        element.addEventListener("click", (event) => {
            var target = event.target;
            var divToGoBack = $(target).data("divtohide");
            var divToShow = $(target).data("divtoshow");
            // Checks for resize data, if it exists, pass it to goBack()
            if ($(target).data("resize") != null) {
                var resizeInfo = JSON.parse("[" + $(target).data("resize") + "]");
            }
            goBack(divToGoBack, divToShow, resizeInfo);
        });
    });

    document.getElementById("create_new_addon").addEventListener("click", () => {
        $("#create_new_addon .top div h3").text("Addon creation");
        $("#create_new_addon, #addonDirPrompt").fadeIn();
    });

    $("#jsonAddonValidate").click(() => {
        if ($(".typeCheckbox:checked").val() != null) {
            addonTags = $(".typeCheckbox:checked").map(function(){
                return $(this).attr("name");
            }).get();
        }

        var ignoreList = $("#jsonIgnore input[name='addonIgnore']").val().replace(/\s/g,"").split(",");
        
        if (jsonChecks[0, 1]) {
            addonToCreateData.title = addonTitle;
            addonToCreateData.type = addonType;
            addonToCreateData.tags = addonTags;
            addonToCreateData.ignore = ignoreList;
            ipcRenderer.send("createJsonFile", JSON.stringify(addonToCreateData), currentNewAddon);
            if (addonToCreateData.type === "serverContent") { addonToCreateData.type = "Server Content" }
            if (addonToCreateData.tags !== "") { $("#gmaPreview table tr .addonTags").text(addonToCreateData.tags[0] + ", " + addonToCreateData.tags[1]); } else { $("#gmaPreview table tr .addonTags").text("None"); }
            $("#gmaPreview table tr .addonTitle").text(addonToCreateData.title);
            $("#gmaPreview table tr .addonType").text(addonToCreateData.type);
            
            $("#addonIconCheck").data("divtoshow", "#gmaPrep");
            $("#addonIconCheck").data("resize", "500, 510");
        }
    });

    $("#yourAddons").on("click", ".updateAddon", (event) => {
        var target = event.target;
        existingAddonId = $(target).data("id");
        $("#create_new_addon .top div h3").text("Updating addon");
        goBack("#update_existing_addon", "#create_new_addon, #addonDirPrompt", [500, 250] )
    });

    document.querySelector(".typeCheckbox").addEventListener("click", (event) => {
        var target = $(event.target);
        if (jsonCheckboxCount < 2 && target.is(":checked")) {
            jsonCheckboxCount++;
        } else if (jsonCheckboxCount != 0 && !target.is(":checked")) {
            jsonCheckboxCount--;
        } else if (jsonCheckboxCount == 2 && target.is(":checked")) {
            event.preventDefault();
        }

        if (jsonCheckboxCount == 2) {
            var checkboxes = $('.typeCheckbox');
            if (!checkboxes.is(":checked")) {
                $(checkboxes).prop('disabled', true);
            }
        }
    });

    // Dyamically change boolean based on whether or not string is empty 
    $("#jsonTitle >  input[name='addonTitle']").on("keyup", () => {
        if ($("#jsonTitle >  input[name='addonTitle']").val() != "") {
            addonTitle = $("#jsonTitle >  input[name='addonTitle']").val();
            jsonChecks[0] = true;
            validateJsonForm();
        } else {
            jsonChecks[0] = false;
            validateJsonForm();
        }
    });

    $("#jsonType > select[name='addonType']").change(() => {
        if ($("#jsonType > select[name='addonType']").val() != "null") {
            addonType = $("#jsonType > select[name='addonType']").val();
            jsonChecks[1] = true;
            validateJsonForm();
        } else {
            jsonChecks[1] = false;
            validateJsonForm();
        }
    });

    $(".resetAddonExtraction, #extraction_back").click(() => {
        resetAddonExtraction();
    });

    $("#createOnly").click(() => {
        onlyCreate = true;
        $("#gmaPrep").fadeOut(() => {
            win.setBounds({height: 250});
            $("#createGMA").fadeIn();
            ipcRenderer.send("createGMAFile", currentNewAddon);
        });
    });

    $("#createAndUpload").click(() => {
        onlyCreate = false;
        $("#gmaPrep").fadeOut(() => {
            win.setBounds({height: 250});
            $("#createGMA").fadeIn();
            ipcRenderer.send("createGMAFile", currentNewAddon);
        });
    });

    // =============
    // AJAX Requests
    // =============

    // Check current version, let user know if it differs
    $.ajax({
        type: "GET",
        url: "https://api.github.com/repos/Leeous/gmod-addon-tool/releases/latest",
        dataType: "json"
    }).done((data) => {
        if (data.tag_name != currentAppVersion) {
            newUpdate(data.tag_name);
        }
    });

    // =========
    // Functions
    // =========

    // This will compare the local version # with the most recent release on GitHub
    function newUpdate(ver) {
        // Check to see if user doesn"t want us to remind about updates
        if (settings.get("remindUpdate") == null || settings.get("remindUpdate")) {
            dialog.showMessageBox(win, {
                type: "info",
                buttons: ["Cancel", "Open"],
                message: "Update " + ver + " is available for download.",
                title: "New update available!",
                checkboxLabel: "Don't remind me again",
            }).then(response => {
                if (response.response == 1) {
                    shell.openExternal("https://github.com/Leeous/gmod-addon-tool/releases");
                }
                if (response.checkboxChecked) {
                    console.log("Will no longer remind user about updates.")
                    settings.set("remindUpdate", false);
                }
            }).catch(err => {
                console.log("Something went wrong.");
            });
        }
    }
    
    // Request JSON infomation on addons based on ID (this cannot read from private addons)
    function getAddonInfoFromSteam(message) {
        if (message.length == 0) { okToProcessAddonList = true; $("#update_existing_addon_button").text("No public addons").attr("disabled", "true").css({"backgroundColor": "#0261a5", "cursor": "not-allowed"}); }
        arrayOfAddonIds = message;
        arrayOfAddonIds = arrayOfAddonIds.chunk(13);
        for (let i = 0; i < arrayOfAddonIds.length; i++) {
            sendAPIRequest(arrayOfAddonIds[i], arrayOfAddonIds[i].length, arrayOfAddonIds.length);
        }
    }

    function sendAPIRequest(array, length, amtOfArrays) {
        let queuePosition = 0;

        for (let i = 0; i < array.length; i++) {
            // const element = arrayOfAddonIds[i];
            api_data["publishedfileids[" + i + "]"] = parseInt(array[i]);
        }
        
        api_data["itemcount"] = array.length;

        $.ajax({
            type: "POST",
            url: "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/",
            data: api_data,
            dataType: "json",
        }).done((data) => {
            var response = data.response;
            console.log(response);
            if (response.result == 1) {
                for (let i = 0; i < response.resultcount; i++) {
                    if (response.publishedfiledetails[i].result == 1) {
                        var addon = response.publishedfiledetails[i];
                        var addonObject = {
                            "title": addon.title,
                            "id": addon.publishedfileid,
                            "icon": addon.preview_url,
                            "views": addon.views,
                            "lifesubs": addon.lifetime_subscriptions,
                            "favs": addon.favorited
                        }
                        queuePosition++;
                        addon_data.push(addonObject);
                    }
                }
            }

            if (queuePosition != amtOfArrays) {
                okToProcessAddonList = true;
                $("#update_existing_addon_button").text("Update existing addon");
            }
            // Change button text and allow user to view/update thier addons
        });
    }

    Object.defineProperty(Array.prototype, 'chunk', {
        value: function(chunkSize){
            var temporal = [];
            for (var i = 0; i < this.length; i+= chunkSize){
                temporal.push(this.slice(i,i+chunkSize));
            }
            return temporal;
        }
    });

    // General function for transitioning between div tags (with a shitty name)
    function goBack(divToFadeOut, divToFadeIn, resizeInfo) {
        $(divToFadeOut).fadeOut(() => {
            if (resizeInfo != null) {
                win.setBounds({
                    width: resizeInfo[0],
                    height: resizeInfo[1]
                });
                // if (resizeInfo[2] != null) {win.setResizable(resizeInfo[2])}
            }
            $(divToFadeIn).fadeIn();
        })
    }

    // Get array of addon infomation and append their info to #yourAddons
    function populateAddonList(array) {
        console.log(array)
        // This check is done to make sure this only gets executed once
        if (!donePopulatingAddonList) {
            for (let i = 0; i < array.length; i++) {
                console.log(array)
                $("#yourAddons").append(`
                <section class="publishedAddon">
                    <aside class="publishedTitle">
                        <h1>${array[i].title}</h1>
                    </aside>
                    <aside class="publishedStats">
                        <div>
                            <img src="src/img/views.png" alt="Views"/>
                            <p>${array[i].views.toLocaleString()}</p>
                        </div>
                        <div>
                            <img src="src/img/subs.png" alt="Downloads"/>
                            <p>${array[i].lifesubs.toLocaleString()}</p>
                        </div>
                        <div>
                            <img src="src/img/favs.png" alt="Favorites"/>
                            <p>${array[i].favs.toLocaleString()}</p>
                        </div>
                    </aside>
                    <footer class="publishedControls">
                        <p><a href="steam://url/CommunityFilePage/${array[i].id}">View</a></p>
                        <p><a class="transition_button updateAddon" data-resize="500, 260" data-id="${array[i].id}"/a>Update</p>
                    </footer>
                </section>
                `);
                donePopulatingAddonList = true;
            }

            // Make sure if nothing is returned to let the user know
            if (apiError == 400) {
                donePopulatingAddonList = true;
                errorNote("Steam API: HTTP 400 error.");
            } else if (apiError == 429) {
                donePopulatingAddonList = true;
                errorNote("Steam API: HTTP 429 error. Try again later.");
            }
        }
    }

    // Resets any data we've gotten from the user for the new addon
    function resetAddonCreation() {
        jsonCheckboxCount = 0;
        onlyCreate = null;
        jsonExists =null

        // Clear the old data we used to make addon.json
        addonToCreateData = {
            "title": "",
            "type": "",
            "tags": [],
            "ignore": []
        };

        // Reset all input values & checkboxes
        $("#jsonTitle > input[name='addonTitle']").val("");
        $("select[name='addonType']").val("null");
        $(".typeCheckbox").prop("checked", false);
        $("#jsonIgnore > input[name='addonIgnore']").val("");

        // Clear the addon name on directory selection
        $("#addonDir b").text("");

        // Set the file inputs to null
        $("#addon_dir_folder").val(null);
        $("#addon_icon").val(null);

        // Reset directory validation
        $("#addonDirCheck").css({backgroundColor: "#0261A5", cursor: "not-allowed"});
        $("#addonDirCheck").prop("disabled", true);

        // Reset icon validation
        $("#addonIconCheck").css({backgroundColor: "#0261A5", cursor: "not-allowed"});
        $("#addonIconCheck").prop("disabled", true);

        // Reset validation checks
        jsonChecks = [false, false];
        validateJsonForm();

        // Reset existingAddonId if user was updating instead of creating
        existingAddonId = null;

        // Hide any div that may still be displayed
        $("#addonIconPrompt, #jsonCreator, #gmaPrep, #createGMA, #new_addon, #uploading, #uploadToWorkshopPrompt, #newAddonLocation").css("display", "none");
    }

    function resetAddonExtraction() {
        $("#extracting_addon, #extraction_done").css("display", "none");
        $("#currentGMAFile").text("");
        $("#addon_extract_next button").css({backgroundColor: "#0261A5", cursor: "not-allowed"});
        $("#addon_extract_next button").prop("disabled", true);
    }

    // Ensure all options that are required are checked
    function validateJsonForm() {
        if (jsonChecks[0] && jsonChecks[1]) {
            $("#jsonAddonValidate").css("background-color", "#56bd56");
            $("#jsonAddonValidate").prop("disabled", false);
            $("#jsonAddonValidate").css("cursor", "pointer");
            populateAddonJSONInfo()
        } else {
            $("#jsonAddonValidate").prop("disabled", true);
            $("#jsonAddonValidate").css("cursor", "not-allowed");
            $("#jsonAddonValidate").css("background-color", "#0261A5")
        }
    }

    function errorNote(message, fatal) {
        $("#errorNote .errorText").text(message);
        ipcRenderer.send("logError", [message]);
        $("#errorNote").fadeIn().delay(5000);
        setTimeout(() => {
            if (fatal) { resetAddonCreation(); remote.app.relaunch(); remote.app.exit(0); } // Kills addon flow if something fucks up
        }, 5000);
    }

    // ========================
    // app.js related functions
    // ========================

    // Changes attributes depending on if addon.json exists
    ipcRenderer.on("addonJSONCheck", (e, exists, json) => { 
        populateAddonJSONInfo(e, exists, json);
    });

    function populateAddonJSONInfo(e, exists, json) {
        json = JSON.parse(JSON.stringify(eval('('+ json +')')));
        if (exists) {
            if (json.type === "serverContent") { json.type = "Server Content" }
            if (json.tags !== "") { $("#gmaPreview table tr .addonTags").text(json.tags[0] + ", " + json.tags[1]); } else { $("#gmaPreview table tr .addonTags").text("None"); }
            $("#gmaPreview table tr .addonTitle").text(json.title);
            $("#gmaPreview table tr .addonType").text(json.type);
            
            $("#addonIconCheck").data("divtoshow", "#gmaPrep");
            $("#addonIconCheck").data("resize", "500, 510");
        }
    }

    // Transition screen after we've extracted the GMA
    ipcRenderer.on("finishExtraction", (e) => {
        $("#extracting_addon").fadeOut(() => {
            win.setBounds({height: 225});
            // $("#extractedGMALocation").attr("href", "steam://url/CommunityFilePage/" + newAddonID)
            $("#extraction_done").fadeIn();
        });
    });
    
    // Try and recieve data from gmpublish about user"s addons
    ipcRenderer.on("addonInfo", (e, message) => {
        getAddonInfoFromSteam(message);
    });

    // Sends an alert if Steam doesn"t initialize 
    ipcRenderer.on("errorAlert", (e, message) => {
        dialog.showErrorBox("Steam is not accessiable", "Steam doesn't seem to be open!\nOpen Steam and restart.");
    });

    ipcRenderer.on("errorNote", (e, message, fatal) => {
        errorNote(message, fatal);
    });

    // Get ID of new addon so we can open it in Steam
    ipcRenderer.on("currentAddonID", (event, newAddonID) => {
        $("#uploading").fadeOut(() => {
            win.setBounds({height: 225});
            if (existingAddonId == null) {
                $("#new_addon_link").attr("href", "steam://url/CommunityFilePage/" + newAddonID)
            } else {
                $("#new_addon_link").attr("href", "steam://url/CommunityFilePage/" + existingAddonId)
            }
            $("#new_addon").fadeIn();
        });
    });
    
    // Transitions into the view to upload the created GMA to the workshop
    ipcRenderer.on("addonGMALocation", (event, addonGMA) => {
        addonGMADir = addonGMA;
        $("#createGMA").fadeOut(() => {
            win.setBounds({height: 225});
            if (onlyCreate) {
                $("#newAddonLocation").fadeIn();
            } else {
                console.log(addonGMADir, addonIcon, existingAddonId);
                ipcRenderer.send("uploadToWorkshop", addonGMADir, addonIcon, existingAddonId);
                $("#uploading").fadeIn();
                win.setBounds({height: 250});
            }
        });
    });
});