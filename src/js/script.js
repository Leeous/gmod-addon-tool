
// Global Variables
$(document).ready(() => {
    const { remote, ipcRenderer, files } = require('electron')
    const settings = require('electron-settings');
    let win = remote.getCurrentWindow()

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
            console.log(filePath)
            $('#dir_prompt_next button').css('background-color', '#56bd56')
            $('#dir_prompt_next button').prop('disabled', false)
            $('#dir_prompt_next button').css('cursor', 'pointer')
            $('#checkmarkNote').fadeIn(() => {
                $('#checkmarkNote').delay(1000).fadeOut();
            })
            settings.set('gmodDirectory', filePath);
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

});