// Global Variables
const {
    remote,
    ipcRenderer,
    files
} = require('electron')
const settings = require('electron-settings');
let win = remote.getCurrentWindow()

var addon_data = []

$(document).ready(() => {
    ipcRenderer.on('message', (event, message) => {

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
                    var addon = data.response.publishedfiledetails["0"]
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
                    
                },
                dataType: 'json',
            });


            for (let i = 0; i < arrayOfAddonIds.length; i++) {
                if (i < arrayOfAddonIds) {
                    $('#yourAddons').append("<p><b>No addons found!</b><br/><br/>Either you don't have Steam open or haven't uploaded anything.</p>")
                }
            }
        }
        
        if (0 == addon_data.length) {
            $('#yourAddons').append("<p><b>No addons found!</b><br/><br/>Either you don't have Steam open or haven't uploaded anything.</p>")
        }
        
        for (let i = 0; i < addon_data.length; i++) {
            console.log('HEY')
            $('#yourAddons').append("<div class='addon_existing'><p>" + addon_data[i].title + "</p></div>")
        }

    });

    if (settings.get('gmodDirectory') != null) {
        $('#addon_management').fadeIn()
    } else {
        $('#directory_selection').fadeIn()
    }

    $('#closeApp').click(() => {
        window.close()
    })

    $('#minApp').click(() => {
        remote.getCurrentWindow().minimize();
    })

    $('#fake_select').click(() => {
        $('#real_select').click();
    })

    $('#real_select').change(() => {
        var filePath = document.getElementById("real_select").files[0].path
        var desName = filePath.substring(filePath.length - 9, filePath.length)
        ipcRenderer.send('checkIfDirectoryExists', filePath + "\\bin\\gmad.exe")
        ipcRenderer.send('checkIfDirectoryExists', filePath + "\\bin\\gmpublish.exe")
        if (desName == "GarrysMod") {
            $('#status_of_dir').css('color', 'lightgreen')
            $('#status_of_dir').text('Found gmad.exe and gmpublish.exe!')
            $('#dir_prompt_next button').css('background-color', '#56bd56')
            $('#dir_prompt_next button').prop('disabled', false)
            $('#dir_prompt_next button').css('cursor', 'pointer')
            $('#checkmarkNote').fadeIn(() => {
                $('#checkmarkNote').delay(1000).fadeOut();
            })
            settings.set('gmodDirectory', filePath);
            ipcRenderer.send('getAddonInfo')
        } else {
            $('#status_of_dir').css('color', 'red')
            $('#status_of_dir').text("Can't find gmad.exe or gmpublish.exe!")
            console.log(filePath)
            $('#dir_prompt_next button').prop('disabled', true)
            $('#dir_prompt_next button').css('cursor', 'not-allowed')
        }
    })

    $('#dir_prompt_next button').click(() => {
        $('#directory_selection').fadeOut(() => {
            $('#addon_management').fadeIn()
        });
    })

    $('#update_existing_addon_button').click(() => {
        $('#addon_management_prompt').fadeOut(() => {
            $('#update_existing_addon').fadeIn()
        })
    });

    $('.back_button').click((event) => {
        var target = event.target
        var divToGoBack = $(target).data('forwards')
        var divToShow = $(target).data('backwards')
        goBack(divToGoBack, divToShow)
    })

    function goBack(divToFadeOut, divToFadeIn) {
        $(divToFadeOut).fadeOut(() => {
            $(divToFadeIn).fadeIn();
        })
    }

    

});