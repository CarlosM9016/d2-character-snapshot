let search_button = document.getElementById("search_button");
let descriptions_button = document.getElementById("descriptions_button");


search_button.addEventListener("click", return_to_search);
descriptions_button.addEventListener("click", toggle_descriptions);

function return_to_search() {
    window.location.replace(``);
}

function toggle_descriptions() {
    var descriptions = document.getElementsByClassName("description");

    for(description in descriptions) {
        if(description.style.visibility == "hidden") {
            description.style.visibility = "visible";
            continue;
        }
        description.style.visibility = "hidden";
    }
}