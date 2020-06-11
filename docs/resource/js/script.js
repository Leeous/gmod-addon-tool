window.onload = () => {
    console.info("GMAT page script loaded");
    var updateSlide = document.getElementById("updateSlide");
    var converter = new showdown.Converter();
    var hostOS;

    if (window.navigator.platform == "Win32" || window.navigator.platform == "Win64") {
        hostOS = "Windows";        
    }

    const releaseReq = new Request('https://api.github.com/repos/Leeous/gmod-addon-tool/releases');

    fetch(releaseReq).then(response => response.json()).then(json =>
        json.forEach((element, i) => {
            patchName = element.name;
            patchLink = element.html_url;
            console.log(element)
            // Get download links for release

            convertedPatch = converter.makeHtml(element.body);
            newArticle = document.createElement("article");
            newArticle.innerHTML  = `
            <header class="updatePost">
                <h1>${patchName}</h1>
                <div class="updateDown">
                    <a href="${patchLink}" target="_blank">View on Github <i class="fa fa-github" aria-hidden="true"></i></a>
                </div>
            </header>
            <main class="updateChanglog">
                ${convertedPatch}
            </main>
            `
            // newArticle.innerHTML = "<header class='updateTag'><h1>" + patchName + "</h2></header><main class='patchDesc'>" + convertedPatch + "</main>";
            document.getElementById("updateSlide").appendChild(newArticle);
        })
    );

    // Add event listener to ".navItem" and handle page switch
    document.querySelectorAll(".navItem").forEach(item => {
        item.addEventListener("click", event => {
            if (event.target.classList == "navItem") {
                var pageToFade = document.querySelector(".currentPage").dataset.page
                var pageToShow = event.target.dataset.page;
                document.querySelector(".currentPage").classList.remove("currentPage");
                event.target.classList.add("currentPage");
                document.getElementById(pageToFade).hidden = true;
                document.getElementById(pageToShow).hidden = false;
            }
        });
    });
}