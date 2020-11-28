// Global Variables
const {
    remote,
    ipcRenderer,
    files,
    app
} = require("electron");
const settings = require("electron-settings");
const shell = require("electron").shell;
const imageSize = require("image-size");
const { dialog } = require("electron").remote;
const queryString = require('querystring');
let win = remote.getCurrentWindow();
addon_data = [];
api_data = {"itemcount": 0};
okToProcessAddonList = false;
donePopulatingAddonList = false;
currentAppVersion = "v2.3";
hiddenAddons = 0;
apiError = 0;

// These are addon related variables, reset on completion/fail/abort
currentNewAddon = "";
jsonCheckboxCount = 0;
jsonChecks = [false, false];
addonGMADir = "";
existingAddonId = null;
let addonTitle = "";
let addonTags = []
let addonType = "";
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
    //#########//
    // Startup //
    //#########//

    // Switch to dark stylesheet if it's set
    if (settings.get("darkMode")) {
        document.querySelector("link[rel='stylesheet'][href^='src']").setAttribute("href", "src/css/style-dark.css");
    }

    // Show user disclaimer if it has not been accepted
    if (!settings.get('disclaimer')) {
        dialog.showMessageBox(win, {
            type: "info",
            buttons: ["I understand", "Exit"],
            message: "This is an unofficial tool that is meant to make it easier to create, update, and extract Garry's Mod addons. This tool is in no way endorsed by, or otherwise affiliated with Facepunch Studios. Keep in mind that addon updates are FINAL and they're impossible to revert. ",
            title: "Disclaimer",
        }).then(response => {
            if (response.response == 0) {
                settings.set("disclaimer", true);
            }
            if (response.response == 1) {
                window.close();
            }
        }).catch(err => {
            console.log("Something went wrong.");
        });
    }

    // Check current version, let user know if it differs
    var getNewestAppVersion = new XMLHttpRequest();
    getNewestAppVersion.open("GET", "https://api.github.com/repos/Leeous/gmod-addon-tool/releases/latest", true);
    getNewestAppVersion.setRequestHeader('Content-type', 'application/json');
    getNewestAppVersion.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var response = this.responseText; 
            var data = JSON.parse(response);
            if (data.tag_name !== currentAppVersion) {
                newUpdate(data.tag_name);
            }
        }
    };
    getNewestAppVersion.send(JSON.stringify(api_data));

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

    // If user has already defined their Garrysmod directory, just skip ahead to #addon_management
    if (settings.get("gmodDirectory")) {
        fadeIn("#addon_management");
        fadeIn("#addon_management_prompt");
        win.setBounds({
            height: 200
        });
        ipcRenderer.send("getAddonInfo");
    } else {
        fadeIn("#directory_selection");
    }

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
            // Checks to see if directory user selects contains gmad.exe & gmpublish.exe
            ipcRenderer.send("checkIfDirectoryExists", filePath + "/bin/gmad.exe");
            ipcRenderer.send("checkIfDirectoryExists", filePath + "/bin/gmpublish.exe");
            if (desName == "GarrysMod") {
                document.getElementById("status_of_dir").style.color = "lightgreen";
                document.getElementById("status_of_dir").innerHTML = "Found gmad.exe and gmpublish.exe!";
                document.querySelector("#dir_prompt_next button").style.backgroundColor = "#56bd56";
                document.querySelector("#dir_prompt_next button").disabled = false;
                document.querySelector("#dir_prompt_next button").style.cursor = "pointer";
                fadeIn("#checkmarkNote", () => {
                    setTimeout(() => {
                        fadeOut("#checkmarkNote");
                    }, 500)
                });
                settings.set("gmodDirectory", filePath);
                ipcRenderer.send("getAddonInfo");
            } else {
                document.getElementById("status_of_dir").style.color = "red";
                document.getElementById("status_of_dir").innerHTML = "Can't find gmad.exe or gmpublish.exe!"
                document.querySelector("#dir_prompt_next button").disabled = true;
                document.querySelector("#dir_prompt_next button").style.cursor = "not-allowed";
            }
        }
        }).catch(err => {
            console.error("Dailog failed to open!");
        });
    });

    //###########//
    // Main Menu //
    //###########//

    document.getElementById("create_addon_button").addEventListener("click", () => {
        document.querySelector("#create_new_addon .top div h3").innerHTML = "Addon creation";
        fadeIn("#create_new_addon, #addonDirPrompt");
    });

    document.getElementById("update_existing_addon_button").addEventListener("click", () => {
        if (okToProcessAddonList) {
            populateAddonList(addon_data);
            fadeOut("#addon_management_prompt", () => {
                fadeIn("#update_existing_addon");
            });
        }
    });

    // Extraction button is handled by transition()

    //#########//
    // Utility //
    //#########//

    // General function for transitioning between div tags
    function transition(elToHide, elToShow, resizeInfo) {
        var transitionTime = 25; 
        fadeOut(elToHide, () => {
            // Resize window if we get resize info
            if (resizeInfo != null) {
                win.setBounds({
                    width: resizeInfo[0],
                    height: resizeInfo[1]
                });
            }
            fadeIn(elToShow, null, transitionTime);
        }, transitionTime);
    }
    
    function fadeOut(elToHide, callback, transitionTime) {
        if (!transitionTime) { var transitionTime = 25; }
        var fadeOutOpacity = 1;
        var timer = setInterval(() => {
            if (fadeOutOpacity <= 0.1) {
                // Done with animation
                clearInterval(timer);
                document.querySelectorAll(elToHide).forEach((element) => {
                    element.style.display = "none";
                });
                if (callback != null) { callback(); }
            }
            document.querySelectorAll(elToHide).forEach((element) => {
                element.style.opacity = fadeOutOpacity;
                fadeOutOpacity -= 0.10;
            });
        }, transitionTime);
    }

    function fadeIn(elToShow, callback, transitionTime) {
        if (!transitionTime) { var transitionTime = 25 }
        var fadeInOpacity = 0.0;
        document.querySelectorAll(elToShow).forEach((element) => {
            element.style.opacity = 0;
            element.style.display = "block";
        });
        var timer = setInterval(() => {
            if (fadeInOpacity >= 1) {
                // Done with animation
                clearInterval(timer);
                if (callback != null) { callback(); }
            }
            document.querySelectorAll(elToShow).forEach((element) => {
                element.style.opacity = fadeInOpacity;
                fadeInOpacity += 0.10;
            });
        }, transitionTime);
    }

    document.querySelectorAll(".transition_button").forEach((element) => {
        element.addEventListener("click", (event) => {
            var target = event.target;
            var elToHide = target.dataset.divtohide;
            var elToShow = target.dataset.divtoshow;
            // Checks for resize data, if it exists, pass it to transition()
            if ($(target).data("resize") != null) {
                var resizeInfo = JSON.parse("[" + target.dataset.resize + "]");
            }
            transition(elToHide, elToShow, resizeInfo);
        });
    });


    // fatal: app cannnot contiune, will close in few seconds. flowFatal: addon creation/update failed, resets creation/update process.
    function errorNote(message, fatal, flowFatal) {

        // Update #errorNote with the error text
        document.querySelector("#errorNote .errorText").innerHTML = message;
        
        // Countdown durations
        let countdownSeconds = 15;
        let countdownMS = (fatal) ? 20000 : 3000;

        // If the addon flow failed, hide all divs and fade in #addon_management_prompt
        if (flowFatal) { 
            resetAddonCreation(() => {
                fadeIn("#addon_management_prompt");
            });
        }

        // If error is fatal, display countdown until exit.
        if (fatal) {
            document.getElementById("fatalError").style.display = "block";

            // Countdown logic
            setInterval(() => {
                document.querySelector("#fatalError span").innerHTML = countdownSeconds;
                countdownSeconds--
            }, 1000);
            
            // Exit app in 17000ms
            setTimeout(() => {
                resetAddonCreation(); remote.app.exit(0); // Kills addon flow if something fucks up
            }, 17000);
        } else {
            document.getElementById("fatalError").style.display = "none";
        }

        // Fade in #errorNote for countdownMS (changed based on fatal or flowFatal)
        fadeIn("#errorNote");
        setTimeout(() => {
            fadeOut("#errorNote");
        }, countdownMS);

        // Log error
        ipcRenderer.send("logError", [message]);
    }

    // Handle errors from app.js
    ipcRenderer.on("errorNote", (e, message, fatal, flowFatal) => {
        errorNote(message, fatal, flowFatal);
    });
    
    //######################//
    // Workshop addon logic //
    //######################//

    // Try and recieve data from gmpublish about user"s addons
    ipcRenderer.on("addonInfo", (e, message) => {
        getAddonInfoFromSteam(message);
    });

    // Request JSON infomation on addons based on ID (this cannot read from private addons)
    var updateExistingAddonButtonHTML = document.getElementById("update_existing_addon_button");
    function getAddonInfoFromSteam(message) {
        console.log(message)
        if (message.length == 0) { okToProcessAddonList = true; 
            updateExistingAddonButtonHTML.innerHTML = "No public addons";
            updateExistingAddonButtonHTML.disabled = true;
            updateExistingAddonButtonHTML.style.backgroundColor = "#0261a5";
            updateExistingAddonButtonHTML.style.cursor = "not-allowed"; 
        }
        arrayOfAddonIds = message;
        arrayOfAddonIds = arrayOfAddonIds.chunk(13);
        for (let i = 0; i < arrayOfAddonIds.length; i++) {
            sendAPIRequest(arrayOfAddonIds[i], arrayOfAddonIds[i].length, arrayOfAddonIds.length);
        }
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

    // Ask Steam for addon info
    function sendAPIRequest(array, length, amtOfArrays) {
        let queuePosition = 0;

        for (let i = 0; i < array.length; i++) {
            api_data["publishedfileids[" + i + "]"] = parseInt(array[i]);
        }
        
        var steamRequest = new XMLHttpRequest();
        steamRequest.open("POST", "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/", true);
        steamRequest.setRequestHeader('Content-type', 'application/x-www-form-urlencoded; charset=UTF-8');
        api_data["itemcount"] = array.length;
        steamRequest.send(queryString.stringify(api_data));
        steamRequest.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                var steamDataJSON = JSON.parse(this.response);
                var response = steamDataJSON.response;
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
                        console.log(addonObject)
                        addon_data.push(addonObject);
                    } else {
                        hiddenAddons++;
                    }
                }
                if (queuePosition != amtOfArrays) {
                    // Change button text and allow user to view/update thier addons
                    okToProcessAddonList = true;
                    updateExistingAddonButtonHTML.innerHTML = "Update existing addon";
                    updateExistingAddonButtonHTML.disabled = false;
                }
            }
        };
        steamRequest.addEventListener("error", (err) => console.log(err));
    }

    // Get array of addon infomation and append their info to #yourAddons
    function populateAddonList(array) {
        // This check is done to make sure this only gets executed once
        if (!donePopulatingAddonList) {
            for (let i = 0; i < array.length; i++) {
                document.getElementById("yourAddons").innerHTML = document.getElementById("yourAddons").innerHTML + `
                <section class="publishedAddon">
                    <aside class="publishedTitle">
                        <h1>${array[i].title}</h1>
                        <img src="${array[i].icon}"/>
                    </aside>
                    <aside class="publishedStats">
                        <div>
                            <img src="src/img/${settings.get("darkMode") ? "views-dark.png" : "views.png" }" alt="Views"/>
                            <p>${array[i].views.toLocaleString()}</p>
                        </div>
                        <div>
                            <img src="src/img/${settings.get("darkMode") ? "subs-dark.png" : "subs.png" }" alt="Downloads"/>
                            <p>${array[i].lifesubs.toLocaleString()}</p>
                        </div>
                        <div>
                            <img src="src/img/${settings.get("darkMode") ? "favs-dark.png" : "favs.png" }" alt="Favorites"/>
                            <p>${array[i].favs.toLocaleString()}</p>
                        </div>
                    </aside>
                    <footer class="publishedControls">
                        <p><a href="steam://url/CommunityFilePage/${array[i].id}">View</a></p>
                        <p><a class="transition_button updateAddon" data-resize="500, 260" data-id="${array[i].id}"/>Update</p>
                    </footer>
                </section>
                `;
                donePopulatingAddonList = true;
            }
            document.querySelectorAll(".updateAddon").forEach((element) => {
                element.addEventListener("click", (event) => {
                    var target = event.target;
                    console.log(target)
                    existingAddonId = target.dataset.id;
                    document.querySelector("#create_new_addon .top div h3").innerHTML = "Updating addon";
                    transition("#update_existing_addon", "#create_new_addon, #addonDirPrompt", [500, 250])
                    console.log(existingAddonId)
                });
            });
            $("#yourAddons").append("<p>...and " + hiddenAddons + ` private ${hiddenAddons == 1 ? "addon" : "addons" }.</p>`);
            // Make sure if nothing is returned to let the user know
            if (apiError == 400) {
                donePopulatingAddonList = true;
                errorNote("Steam API: HTTP 400 error.", false, false);
            } else if (apiError == 429) { // Too many requests
                donePopulatingAddonList = true;
                errorNote("Steam API: HTTP 429 error. Try again later.", false, false);
            }
        }
    }

    //#####################//
    // Addon Creation Flow //
    //#####################//

    // If directory exists (and is writable/readable) allow user to proceed
    document.getElementById("addon_dir_folder").addEventListener("click", () => {
        dialog.showOpenDialog(win, dirDialogOptions).then(result => {
            if (!result.canceled) {
                currentNewAddon = result.filePaths[0];
                if (currentNewAddon != null) {
                    currentNewAddon = currentNewAddon.replace(/\\/g, "/");
                    ipcRenderer.send("checkIfDirectoryExists", currentNewAddon, true);
                    var n = currentNewAddon.lastIndexOf("/");
                    var result = currentNewAddon.substring(n + 1);
                    document.querySelector("#addonDir b").innerHTML = result;
                    document.querySelector("#addonDirCheck").style.backgroundColor = "#56bd56";
                    document.querySelector("#addonDirCheck").style.cursor = "pointer";
                    document.querySelector("#addonDirCheck").disabled = false;
                }
            }
        }).catch(err => {
            console.error("Dailog failed to open!");
        })
    });

    // Prompts user for an icon for their addon
    document.getElementById("addon_icon").addEventListener("click", () => {
        dialog.showOpenDialog(win, imgDialogOptions).then(result => {
            addonIcon = result.filePaths[0];
            addonIcon = addonIcon.replace(/\\/g, "/");
            if (addonIcon != null) {
                ipcRenderer.send("checkIfDirectoryExists", addonIcon);
            }
            var jpegCheck = addonIcon.substring(addonIcon.length - 4);
            var dimensions = imageSize(addonIcon);
            if (jpegCheck == "jpeg" || jpegCheck == ".jpg") {
                if (dimensions.height == 512 && dimensions.width == 512) {
                    document.getElementById("addonIconCheck").style.backgroundColor = "#56bd56";
                    document.getElementById("addonIconCheck").style.cursor = "pointer";
                    document.getElementById("addonIconCheck").disabled = false;
                    document.querySelector("#gmaPrep div img").setAttribute("src", addonIcon);
                } else {
                    errorNote("Image must be an 512x512 baseline JPEG.", false, false);
                }
            } else {
                document.getElementById("addonIconCheck").style.backgroundColor = "#0261A5";
                document.getElementById("addonIconCheck").style.cursor = "not-allowed";
                document.getElementById("addonIconCheck").disabled = true;
                errorNote("Doesn't seem like a JPEG image.", false, false);
            }
        }).catch(err => {
            console.error("Dailog failed to open!");
        });
    });

    // Changes attributes depending on if addon.json exists
    ipcRenderer.on("addonJSONCheck", (e, exists, json) => { 
        populateAddonJSONInfo(e, exists, json);
    });

    function populateAddonJSONInfo(e, exists, json) {
        if (exists) {
            json = JSON.parse(json);
            if (json.type === "serverContent") { json.type = "Server Content" }
            console.log(json);
            switch (json.tags.length) {
                case 1:
                    document.querySelector("#gmaPreview table tr .addonTags").innerHTML = json.tags[0];
                    break;
                case 2:
                    document.querySelector("#gmaPreview table tr .addonTags").innerHTML = json.tags[0], json.tags[1];
                    break;
                default:
                    document.querySelector("#gmaPreview table tr .addonTags").innerHTML = "None"; 
                    break;
             }
            document.querySelector("#gmaPreview table tr .addonTitle").innerHTML = json.title;
            document.querySelector("#gmaPreview table tr .addonType").innerHTML = json.type;
            document.getElementById("addonIconCheck").dataset.divtoshow = "#gmaPrep";
            document.getElementById("addonIconCheck").dataset.resize = "500, 510";
        }
    }

    // addon.json generation form //
    document.getElementById("jsonAddonValidate").addEventListener("click", () => {
        if (document.querySelector(".typeCheckbox:checked") != null) {
            document.querySelectorAll(".typeCheckbox:checked").forEach(element => {
                console.log(element)
                addonTags.push(element.getAttribute("name"))
            });
        }

        var ignoreList = document.querySelector("#jsonIgnore input[name='addonIgnore']").value.replace(/\s/g,"").split(",");
        
        if (jsonChecks[0, 1]) {
            addonToCreateData.title = addonTitle;
            addonToCreateData.type = addonType;
            addonToCreateData.tags = addonTags;
            addonToCreateData.ignore = ignoreList;
            switch (addonTags.length) {
                case 1:
                    document.querySelector("#gmaPreview table tr .addonTags").innerHTML = addonToCreateData.tags[0];
                    break;
                case 2:
                    document.querySelector("#gmaPreview table tr .addonTags").innerHTML = addonToCreateData.tags[0] + ", " + addonToCreateData.tags[1];
                    break;
                default:
                    document.querySelector("#gmaPreview table tr .addonTags").innerHTML = "None";
                    break;
            }
            document.querySelector("#gmaPreview table tr .addonTitle").innerHTML = addonToCreateData.title;
            document.querySelector("#gmaPreview table tr .addonType").innerHTML = addonToCreateData.type;
            ipcRenderer.send("createJsonFile", addonToCreateData, currentNewAddon);
            document.getElementById("addonIconCheck").setAttribute("divtoshow", "#gmaPrep");
            document.getElementById("addonIconCheck").setAttribute("resize", "500, 510");
        }
    });

    // Limit checkboxes to two max, addon tags
    document.querySelector('.typeCheckbox').addEventListener('click', (event) => {
        var target = $(event.target);
        if (jsonCheckboxCount < 2 && target.is(":checked")) {
            jsonCheckboxCount++;
        } else if (jsonCheckboxCount != 0 && !target.is(":checked")) {
            jsonCheckboxCount--;
        } else if (jsonCheckboxCount == 2 && target.is(":checked")) {
            event.preventDefault();
        }

        if (jsonCheckboxCount == 2) {
            var checkboxes = document.querySelectorAll(".typeCheckbox");
            if (checkboxes.checked) {
                checkboxes.disabled = true;
            }
        }
    });

    // Dyamically change boolean based on whether or not string is empty, addon title
    var jsonTitleHTML = document.querySelector("#jsonTitle >  input[name='addonTitle']");
    jsonTitleHTML.addEventListener("keyup", () => {
        if (jsonTitleHTML.value != "") {
            addonTitle = jsonTitleHTML.value;
            jsonChecks[0] = true;
            validateJsonForm();
        } else {
            jsonChecks[0] = false;
            validateJsonForm();
        }
    });

    // Allow user to proceed if addon type is selected
    var jsonTypeHTML = document.querySelector("#jsonType > select[name='addonType']");
    jsonTypeHTML.addEventListener("change", () => {
        if (jsonTypeHTML.value != "null") {
            addonType = jsonTypeHTML.value;
            jsonChecks[1] = true;
            validateJsonForm();
        } else {
            jsonChecks[1] = false;
            validateJsonForm();
        }
    });

    // Ensure all options that are required are checked
    function validateJsonForm() {
        if (jsonChecks[0] && jsonChecks[1]) {
            $("#jsonAddonValidate").css("background-color", "#56bd56");
            $("#jsonAddonValidate").prop("disabled", false);
            $("#jsonAddonValidate").css("cursor", "pointer");
        } else {
            $("#jsonAddonValidate").prop("disabled", true);
            $("#jsonAddonValidate").css("cursor", "not-allowed");
            $("#jsonAddonValidate").css("background-color", (settings.get("darkMode") ? "#0f0f0f" : "#0261A5"))
        }
    }

    // Opens location of new addon (.gma file)
    document.getElementById("gmaLocation").addEventListener("click", () => {
        shell.openItem(addonGMADir.substring(0, addonGMADir.lastIndexOf("/")));
    });

    // GMA Preperation Menu //

    document.getElementById("createOnly").addEventListener("click", () => {
        onlyCreate = true;
        fadeOut("#gmaPrep", () => {
            win.setBounds({height: 250});
            fadeIn("#createGMA");
            ipcRenderer.send("createGMAFile", currentNewAddon);
        });
    });

    document.getElementById("createAndUpload").addEventListener("click", () => {
        onlyCreate = false;
        fadeOut("#gmaPrep", () => {
            win.setBounds({height: 250});
            fadeIn("#createGMA");
            ipcRenderer.send("createGMAFile", currentNewAddon);
        });
    });

    document.getElementById("editAddonJSON").addEventListener("click", () => {
        console.log("Cleared addon data");
        json = null;
        addonTags = [];
    });
 
    // Transitions into the view to upload the created GMA to the workshop
    ipcRenderer.on("addonGMALocation", (event, addonGMA) => {
        addonGMADir = addonGMA;
        fadeOut("#createGMA", () => {
            win.setBounds({height: 225});
            if (onlyCreate) {
                fadeIn("#newAddonLocation");
            } else {
                console.log(addonGMADir, addonIcon, existingAddonId);
                ipcRenderer.send("uploadToWorkshop", addonGMADir, addonIcon, existingAddonId);
                fadeIn("#uploading");
                win.setBounds({height: 250});
            }
        });
    });

    // Get ID of new addon so we can open it in Steam
    ipcRenderer.on("currentAddonID", (event, newAddonID) => {
        $("#uploading").fadeOut(() => {
            win.setBounds({height: 225});
            if (existingAddonId == null) {
                document.getElementById("new_addon_link").setAttribute("href", "steam://url/CommunityFilePage/" + newAddonID);
            } else {
                document.getElementById("new_addon_link").setAttribute("href", "steam://url/CommunityFilePage/" + existingAddonId);
            }
            fadeIn("#new_addon");
        });
    });
    
    // Reset buttons for addon creation/updating
    document.querySelectorAll(".resetAddonCreation").forEach((element) => {
        element.addEventListener("click", (event) => {
            resetAddonCreation();
        });
    });
    
    // Resets any data we've gotten from the user for the new addon
    function resetAddonCreation(finishedCallback) {
        console.log("Resetting addon creation flow...");
        jsonCheckboxCount = 0;
        onlyCreate = null;
        jsonExists = null;
        json = null;
        addonPath = null;

        // Clear the old data we used to make addon.json
        addonToCreateData = {
            "title": "",
            "type": "",
            "tags": [],
            "ignore": []
        };

        // Reset all input values & checkboxes
        document.querySelector("#jsonTitle > input[name='addonTitle']").value = "";
        document.querySelector("select[name='addonType']").value = "null";
        document.querySelectorAll(".typeCheckbox").forEach((el) => el.checked = false);
        document.querySelector("#jsonIgnore > input[name='addonIgnore']").value = "";

        // Clear the addon name on directory selection
        document.querySelector("#addonDir b").innerHTML = "";

        // Set the file inputs to null
        document.getElementById("addon_dir_folder").value = null;
        document.getElementById("addon_icon").value = null;

        // Reset directory validation
        document.getElementById("addonDirCheck").style.backgroundColor = settings.get("darkMode") ? "#0f0f0f" : "#0261A5";
        document.getElementById("addonDirCheck").style.cursor = "not-allowed";
        document.getElementById("addonDirCheck").disabled = true;

        // Reset icon validation
        document.getElementById("addonIconCheck").style.backgroundColor = settings.get("darkMode") ? "#0f0f0f" :"#0261A5";
        document.getElementById("addonIconCheck").style.cursor = "not-allowed";
        document.getElementById("addonIconCheck").disabled = true;

        // Reset validation checks
        jsonChecks = [false, false];
        validateJsonForm();

        // Reset existingAddonId if user was updating instead of creating
        existingAddonId = null;

        // Hide any div that may still be displayed
        document.querySelectorAll("#create_new_addon, #addonIconPrompt, #jsonCreator, #gmaPrep, #createGMA, #new_addon, #uploading, #uploadToWorkshopPrompt, #newAddonLocation").forEach((el) => {
            el.style.display = "none";
        });

        // Run callback, only used for when an addon flow error occurs at the moment, example: addon fails file verification
        try {
            finishedCallback()
        } catch (error) {
            console.log("No callback function provided to resetAddonCreation().")
        }
        
        // Resize window for #addon_management_prompt
        win.setBounds({
            height: 200
        });

        console.log("Done.");
    }

    //###################//
    // Extract GMA logic //
    //###################//

    // Let user select a GMA to extract
    document.getElementById("gmaFileSelection").addEventListener("click", () => {
        dialog.showOpenDialog(win, fileDialogOptions).then(r => {
            gmaToExtract = r.filePaths[0];
            if (gmaToExtract != null) {
                ipcRenderer.send("checkIfDirectoryExists", gmaToExtract);
                var n = gmaToExtract.lastIndexOf("\\");
                var result = gmaToExtract.substring(n + 1, gmaToExtract.length);
                document.getElementById("currentGMAFile").innerHTML = result;
                document.querySelector("#addon_extract_next button").disabled = false;
                document.querySelector("#addon_extract_next button").style.backgroundColor = "#56bd56";
                document.querySelector("#addon_extract_next button").style.cursor = "pointer";
            }
        }).catch(err => { console.error("Dailog failed to open!", err) });
    });

    document.querySelector("#addon_extract_next button").addEventListener("click", () => {
        fadeOut("#extract_addon_select", () => {
            fadeIn("#extracting_addon", () => {
                ipcRenderer.send("extractAddon", gmaToExtract);
            });
        });
    });

    // Opens location of extracted addon
    document.getElementById("extractedGMALocation").addEventListener("click", () => {
        shell.openItem(gmaToExtract.substring(0, gmaToExtract.length - 4));
    });
    
    // Transition screen after we've extracted the GMA
    ipcRenderer.on("finishExtraction", (e) => {
        $("#extracting_addon").fadeOut(() => {
            win.setBounds({height: 225});
            fadeIn("#extraction_done");
        });
    });

    // Reset buttons for extraction
    document.querySelectorAll(".resetAddonExtraction").forEach((element) => {
        element.addEventListener("click", (event) => {
            resetAddonExtraction();
        });
    });
       
    // Reset addon extraction flow
    function resetAddonExtraction() {
        gmaToExtract = null;
        document.getElementById("extracting_addon").style.display = "none";
        document.getElementById("extraction_done").style.display = "none";
        document.getElementById("currentGMAFile").innerHTML = "";
        document.querySelector("#addon_extract_next button").style.backgroundColor = (settings.get("darkMode")) ? "#0f0f0f" : "#0261A5";
        document.querySelector("#addon_extract_next button").style.cursor = "not-allowed";
        document.querySelector("#addon_extract_next button").disabled = true;
    }
});