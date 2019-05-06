// Global Variables
const {
    remote,
    ipcRenderer,
    files
} = require("electron");
const settings = require("electron-settings");
const shell = require("electron").shell;
let win = remote.getCurrentWindow();

addon_data = [];
okToProcessAddonList = false;
donePopulatingAddonList = false;
currentNewAddon = "";
jsonCheckboxCount = 0;
jsonChecks = [false, false];
apiError = 0;
addonGMADir = "";
var addonTitle;
var addonTags;
var addonType;
addonIcon = "";
addonToCreateData = {
    "title": "",
    "type": "",
    "tags": [],
    "ignore": []
}



// Make links open in enternal browser
$(document).on("click", "a[href^='http']", function(event) {
    event.preventDefault();
    shell.openExternal(this.href);
});


$(document).ready(() => {
    // Try and recieve data from gmpublish about user's addons
    ipcRenderer.on("message", (event, message) => {
        var arrayOfAddonIds = message;
        for (let index = 0; index < arrayOfAddonIds.length; index++) {
            $.ajax({
                type: 'POST',
                url: 'https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/',
                data: {
                    'itemcount': 1,
                    'publishedfileids[0]': parseInt(arrayOfAddonIds[index])
                },
                success: function success(data) {
                    var addon = data.response.publishedfiledetails["0"];
                    if (addon.result == 1) {
                        for (let i = 0; i < Object.keys(data).length; i++) {
                            var addonObject = {
                                "title": addon.title,
                                "id": addon.publishedfileid
                            }
                            addon_data.push(addonObject);
                        }
                    }
                },
                error: function (err) {
                    console.log(err)
                },
                dataType: 'json',
            });
        }
        okToProcessAddonList = true;
        $('#update_existing_addon_button').text('Update existing addon');
    });

    // If user has already defined their Garrysmod directory, just skip ahead to #addon_management
    if (settings.get('gmodDirectory') != null) {
        $('#addon_management').fadeIn();
        $('#addon_management_prompt').fadeIn();
        win.setBounds({
            height: 175
        })
        ipcRenderer.send('getAddonInfo');
    } else {
        $('#directory_selection').fadeIn();
    }

    $('#closeApp').click(() => {
        window.close();
    })

    $('#minApp').click(() => {
        remote.getCurrentWindow().minimize();
    })

    // Used to "fake click" the input[type="file"]
    $('.fake_select').click((event) => {
        var fakeButton = event.target;
        var realButton = $(fakeButton).data('buttonclick');
        $(realButton).click();
    })

    // Validate that we have read/write access to the users Garrysmod directory so we can use gmad & gmpublish
    $('#gmod_dir_folder').change(() => {
        var filePath = document.getElementById("gmod_dir_folder").files[0].path;
        var desName = filePath.substring(filePath.length - 9, filePath.length);
        ipcRenderer.send('checkIfDirectoryExists', filePath + "\\bin\\gmad.exe");
        ipcRenderer.send('checkIfDirectoryExists', filePath + "\\bin\\gmpublish.exe");
        if (desName == "GarrysMod") {
            $('#status_of_dir').css('color', 'lightgreen');
            $('#status_of_dir').text('Found gmad.exe and gmpublish.exe!');
            $('#dir_prompt_next button').css('background-color', '#56bd56');
            $('#dir_prompt_next button').prop('disabled', false);
            $('#dir_prompt_next button').css('cursor', 'pointer');
            $('#checkmarkNote').fadeIn(() => {
                $('#checkmarkNote').delay(1000).fadeOut();
            })
            settings.set('gmodDirectory', filePath);
            ipcRenderer.send('getAddonInfo');
        } else {
            $('#status_of_dir').css('color', 'red');
            $('#status_of_dir').text("Can't find gmad.exe or gmpublish.exe!");
            console.log(filePath);
            $('#dir_prompt_next button').prop('disabled', true);
            $('#dir_prompt_next button').css('cursor', 'not-allowed');
        }
    })

    // If directory exists (and is writable/readable) allow user to procede 
    $('#addon_dir_folder').change(() => {
        currentNewAddon = document.getElementById("addon_dir_folder").files[0].path;
        ipcRenderer.send('checkIfDirectoryExists', currentNewAddon);
        var n = currentNewAddon.lastIndexOf('\\');
        var result = currentNewAddon.substring(n + 1);
        $('#addonDir b').text(result);
        $('#addonDirCheck').css('background-color', '#56bd56');
        $('#addonDirCheck').prop('disabled', false);
        $('#addonDirCheck').css('cursor', 'pointer');
    })

    $('#addon_icon').change(() => {
        addonIcon = document.getElementById("addon_icon").files[0].path;
        ipcRenderer.send('checkIfDirectoryExists', addonIcon);
        var jpegCheck = addonIcon.substring(addonIcon.length - 4);
        console.log(jpegCheck)
        if (jpegCheck == "jpeg" || jpegCheck == ".jpg") {
            $('#addonIconCheck').css('background-color', '#56bd56');
            $('#addonIconCheck').prop('disabled', false);
            $('#addonIconCheck').css('cursor', 'pointer');
        } else {
            $('#addonIconCheck').css('background-color', '#0f0f0f');
            $('#addonIconCheck').prop('disabled', true);
            $('#addonIconCheck').css('cursor', 'not-allowed');
            alert("Doesn't seem like a JPEG image.")
        }
    })

    $('#dir_prompt_next button').click(() => {
        $('#directory_selection').fadeOut(() => {
            $('#addon_management').fadeIn();
        });
    })

    $('#update_existing_addon_button').click(() => {
        if (okToProcessAddonList) {
            populateAddonList();
            $('#addon_management_prompt').fadeOut(() => {
                win.setBounds({height: 250})
                $('#update_existing_addon').fadeIn();
            })
        }
    });

    $('#create_new_addon_button').click(() => {
        $('#addon_management_prompt').fadeOut(() => {
            win.setBounds({height: 250})
            $('#create_new_addon, #addonDirPrompt').fadeIn()
        })
    })

    $('.back_button').click((event) => {
        var target = event.target;
        var divToGoBack = $(target).data('forwards');
        var divToShow = $(target).data('backwards');
        if ($(target).data('resize') != null) {
            var resizeInfo = JSON.parse("[" + $(target).data('resize') + "]");
        }
        goBack(divToGoBack, divToShow, resizeInfo);
    })
    
    $('.transition_button').click((event) => {
        var target = event.target;
        var divToGoBack = $(target).data('divtohide');
        var divToShow = $(target).data('divtoshow');
        console.log(divToGoBack, divToShow)
        // Checks for resize data, if it exists, pass it to goBack()
        if ($(target).data('resize') != null) {
            var resizeInfo = JSON.parse("[" + $(target).data('resize') + "]");
        }
        goBack(divToGoBack, divToShow, resizeInfo);
    })

    $('.removeBackOption').click(() => {
        $('#back_button_addon_creation').fadeOut();
    })

    // General function for transitioning between div tags (with a shitty name)
    function goBack(divToFadeOut, divToFadeIn, resizeInfo) {
        $(divToFadeOut).fadeOut(() => {
            if (resizeInfo != null) {
                win.setBounds({
                    width: resizeInfo[0],
                    height: resizeInfo[1]
                });
            }
            $(divToFadeIn).fadeIn();
        })
    }

    // Get array of addon infomation and append their names to #yourAddons
    function populateAddonList() {
        // This check is done to make sure this only gets executed once
        if (!donePopulatingAddonList) {
            for (let i = 0; i < addon_data.length; i++) {
                $('#yourAddons').append("<div class='addon_existing'><p>" + addon_data[i].title + "</p><a href='steam://url/CommunityFilePage/" + addon_data[i].id + "'>View on Steam</a></div>");
                donePopulatingAddonList = true;
            }
            // Make sure if nothing is returned to let the user know
            // TODO: Allow for multiple error codes such as 429 (too many requests)
            // if (apiError == 400) {
            //     $('#yourAddons').append("<p style='background-color: #0f0f0f; padding: 15px 10px; margin: 10px 15px; border-radius: 5px;'><b>Steam Web API Error!</b><br/><br/>Error 400. Maybe</p>");
            //     donePopulatingAddonList = true;
            // }
            if (0 == addon_data.length) {
                $('#yourAddons').append("<p style='background-color: #0f0f0f; padding: 15px 10px; margin: 10px 15px; border-radius: 5px;'><b>No addons found!</b><br/><br/>Either you don't have Steam open or haven't uploaded anything.</p>");
                donePopulatingAddonList = true;
            }
        }
    }

    // $('.addon_existing').hover((event) => {
    //     console.log('hello')
    //     var target = $(event.target);
    //     $(this).find('a:last').fadeIn();
    // })

    $('.typeCheckbox').on('click', (event) => {
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
    })

    // Dyamically change boolean based on whether or not string is empty 
    $("#jsonTitle >  input[name='addonTitle']").on('keyup', () => {
        if ($("#jsonTitle >  input[name='addonTitle']").val() != "") {
            addonTitle = $("#jsonTitle >  input[name='addonTitle']").val();
            jsonChecks[0] = true;
            validateJsonForm();
        } else {
            jsonChecks[0] = false;
            validateJsonForm();
        }
    })

    $("#jsonType > select[name='addonType']").change(() => {
        if ($('#jsonType > select[name="addonType"]').val() != "null") {
            addonType = $('#jsonType > select[name="addonType"]').val();
            jsonChecks[1] = true;
            validateJsonForm();
        } else {
            jsonChecks[1] = false;
            validateJsonForm();
        }
    })

    $('#jsonAddonValidate').click(() => {
        if ($(".typeCheckbox:checked").val() != null) {
            addonTags = $(".typeCheckbox:checked").map(function(){
                return $(this).attr('name');
            }).get();
        }

        var ignoreList = $("#jsonIgnore input[name='addonIgnore']").val().replace(/\s/g,'').split(',');
        
        if (jsonChecks[0, 1]) {
            addonToCreateData.title = addonTitle;
            addonToCreateData.type = addonType;
            addonToCreateData.tags = addonTags;
            addonToCreateData.ignore = ignoreList;
            console.log(addonToCreateData);
            ipcRenderer.send('createJsonFile', JSON.stringify(addonToCreateData), currentNewAddon);
        }
    })

    function validateJsonForm() {
        if (jsonChecks[0] && jsonChecks[1]) {
            $('#jsonAddonValidate').css('background-color', '#56bd56');
            $('#jsonAddonValidate').prop('disabled', false);
            $('#jsonAddonValidate').css('cursor', 'pointer');
        } else {
            $('#jsonAddonValidate').prop('disabled', true);
            $('#jsonAddonValidate').css('cursor', 'not-allowed');
            $('#jsonAddonValidate').css('background-color', "#0f0f0f")
        }
    }

    $("#resetAddonCreation").click(() => {

        jsonCheckboxCount = 0;

        // Clear the old data we used to make addon.json
        addonToCreateData = {
            "title": "",
            "type": "",
            "tags": [],
            "ignore": []
        };

        // Reset all input values & checkboxes
        $('#jsonTitle > input[name="addonTitle"]').val("");
        $('select[name="addonType"]').val("null");
        $('.typeCheckbox').prop('checked', false);
        $('#jsonIgnore > input[name="addonIgnore"]').val("");

        // Clear the addon name on directory selection
        $("#addonDir b").text('');

        // Set the input to null
        $("#addon_dir_folder").val(null);

        // Reset directory validation
        $('#addonDirCheck').css({backgroundColor: "#0f0f0f", cursor: "not-allowed"});
        $('#addonDirCheck').prop('disabled', true);

        // Reset validation checks
        jsonChecks = [false, false];
        validateJsonForm();

        // Hide any div that may still be displayed
        $('#addonjsonPrompt, #jsonCreator, #gmaPrep, #createGMA').css('display', 'none');
    });

    $("#createGMAFile").click(() => {
        $('#gmaPrep').fadeOut(() => {
            win.setBounds({height: 225})
            $('#createGMA').fadeIn();
            ipcRenderer.send('createGMAFile', currentNewAddon);  
        });
    })
    
    $("#uploadCurrentGMA").click(() => {
        ipcRenderer.send('uploadToWorkshop', addonGMADir, addonIcon);
        $('#uploadToWorkshopPrompt').fadeOut(() => {
            win.setBounds({height: 225})
            $('#uploading').fadeIn();
        })
    })
    
    ipcRenderer.on('currentAddonID', (event, newAddonID) => {
        $('#uploading').fadeOut(() => {
            win.setBounds({height: 200})
            $('#new_addon_link').attr('href', 'steam://url/CommunityFilePage/' + newAddonID)
            $('#new_addon').fadeIn()
        })
    })
    
    ipcRenderer.on('addonGMALocation', (event, addonGMA) => {
        addonGMADir = addonGMA;
        $('#createGMA').fadeOut(() => {
            win.setBounds({height: 200})
            $("#uploadToWorkshopPrompt").fadeIn();
        })
    })

});