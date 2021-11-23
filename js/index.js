let search_text = document.getElementById("searching");
let bungie_name_label = document.getElementById("bungie_name_label");
let bungie_name_input = document.getElementById("bungie_name");
let bungie_name_submit = document.getElementById("submit_bungie_name");
let searching_characters_text = document.getElementById("searching_characters");
let users_label = document.getElementById("users_label");
let users_list = document.getElementById("users");
let users_submit = document.getElementById("select_user");
let characters_label = document.getElementById("characters_label");
let character_list = document.getElementById("characters");
let character_submit = document.getElementById("select_character");
let creating_snapshot = document.getElementById("creating_snapshot");
let reset_button = document.getElementById("reset_button");
let error_message = document.getElementById("error_message");

const base_url = ``;

search_text.style.visibility = "hidden";
searching_characters_text.style.visibility = "hidden";
users_label.style.visibility = "hidden";
users_list.style.visibility = "hidden";
users_submit.style.visibility = "hidden";
character_list.style.visibility = "hidden";
character_submit.style.visibility = "hidden";
characters_label.style.visibility = "hidden";
creating_snapshot.style.visibility = "hidden";
error_message.style.visibility = "hidden";

bungie_name_submit.addEventListener("click", search_for_player);
users_submit.addEventListener("click", retrieve_characters);
character_submit.addEventListener("click", create_snapshot);
reset_button.addEventListener("click", reset_page);

var timestamp;

function reset_page() {
    search_text.style.visibility = "hidden";
    searching_characters_text.style.visibility = "hidden";
    users_label.style.visibility = "hidden";
    users_list.style.visibility = "hidden";
    users_submit.style.visibility = "hidden";
    character_list.style.visibility = "hidden";
    character_submit.style.visibility = "hidden";
    characters_label.style.visibility = "hidden";
    creating_snapshot.style.visibility = "hidden";

    timestamp = null;

    while(users_list.hasChildNodes()) {
        users_list.removeChild(users_list.lastElementChild);
    }

    while(character_list.hasChildNodes()) {
	if(typeof character_list.lastElementChild != "Node") {
		break;
	}
        character_list.removeChild(character_list.lastElementChild);
    }
    
    let option = document.createElement("option");
    option.text = "Default C";
    option.style.visibility = "hidden";
    character_list.appendChild(option);
    
    bungie_name_input.value = "";

    bungie_name_label.style.visibility = "visible";
    bungie_name_input.style.visibility = "visible";
    bungie_name_submit.style.visibility = "visible";
}

function create_snapshot() {
    character_list.style.visibility = "hidden";
    character_submit.style.visibility = "hidden";
    characters_label.style.visibility = "hidden";
    creating_snapshot.style.visibility = "visible";

    let selected_user = users_list.options[users_list.selectedIndex];
    let selected_character = character_list.options[character_list.selectedIndex];
    timestamp = Date.now();
    httpGetAsync(`${base_url}/snapshot/${selected_user.membershipInfo[0]}/${selected_user.membershipInfo[1]}/${selected_character.info}/${timestamp}`, display_snapshot);
}

function display_snapshot() {
    window.location.replace(`${base_url}/character/${users_list.options[users_list.selectedIndex].membershipInfo[1]}${character_list.options[character_list.selectedIndex].info}${timestamp}`);
}

function retrieve_characters() {
    users_list.style.visibility = "hidden";
    users_submit.style.visibility = "hidden";
    users_label.style.visibility = "hidden";
    searching_characters_text.style.visibility = "visible";
    let selected_user = users_list.options[users_list.selectedIndex];
    httpGetAsync(`${base_url}/characters/${selected_user.membershipInfo[0]}/${selected_user.membershipInfo[1]}`, display_characters);
}

function display_characters(response) {
    let found_characters = JSON.parse(response);

    for(let i = 0; i < found_characters.length; i++) {
        let option = document.createElement("option");
        option.value = i + "" + found_characters[i].name;
        option.info = found_characters[i].id;
        option.text = found_characters[i].name;
        character_list.appendChild(option);
	if(i == 0) {
	    character_list.value = option.value;
	}
    }

    searching_characters_text.style.visibility = "hidden";
    character_list.style.visibility = "visible";
    character_submit.style.visibility = "visible";
    characters_label.style.visibility = "visible";
}

function search_for_player() {
    bungie_name_label.style.visibility = "hidden";
    bungie_name_input.style.visibility = "hidden";
    bungie_name_submit.style.visibility = "hidden";
    error_message.style.visibility = "hidden";
    search_text.style.visibility = "visible";
    var bungie_name = bungie_name_input.value.split("#");
    httpGetAsync(`${base_url}/search/${bungie_name[0]}/${bungie_name[1]}`, display_players);
}

function display_players(response) {
    if(response == "error") {
        error_message.style.visibility = "visible";
        reset_page();
        return;
    }

    let found_players = JSON.parse(response);

    if(found_players.length <= 0) {
        error_message.style.visibility = "visible";
        reset_page();
        return;
    }

    for(let i = 0; i < found_players.length; i++) {
        let option = document.createElement("option");
        option.value = i + "" + found_players[i].displayName;
        option.membershipInfo = [
            found_players[i].membershipType,
            found_players[i].membershipId
        ]
	option.text = found_players[i].displayName;
        users_list.appendChild(option);
    }

    search_text.style.visibility = "hidden";
    users_list.style.visibility = "visible";
    users_submit.style.visibility = "visible";
    users_label.style.visibility = "visible";
}

function httpGetAsync(theUrl, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4) {
            if(xmlHttp.status == 200) {
                callback(xmlHttp.responseText);
            }
            else {
                error_message.style.visibility = "visible";
                reset_page();
            }
        }
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}
