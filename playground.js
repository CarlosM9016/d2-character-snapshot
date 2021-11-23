const request = require('request');
const fs = require('fs');
const extract = require('extract-zip');
const sqlite = require('sqlite3');
const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
require('dotenv').config();

//Random necessary stuff to use... I should probably make the stored version something that can be generated on first time run
const bungie_base_url = "https://www.bungie.net";
const downloaded_manifest_file = "./downloaded_manifest_version.json";
const api_headers = {"X-API-Key" : process.env.API_KEY};
const magic_number_for_id = 4294967296;

//Info to be used
var manifest_path;
var db;
var characters = {};

//startup();
var web_server_startup_function;

var manifest_dictionary = {};
function initialize_manifest_dicionary() {
    console.log("Building database...");
    fs.readdir("./manifest", (error, filenames) => {
        if(error) {
            throw error;
        }

        for(let i = 0; i < filenames.length; i++) {
            let filename = filenames[i].split(".")[0];
            manifest_dictionary[filename] = require(`./manifest/${filenames[i]}`);
        }
        
        console.log("Database built.");
        web_server_startup_function();
    });
}

function hash_lookup(table, id)
{
    let result = manifest_dictionary[table].find(item => item.id == id);

    if(result == undefined) {
        result = manifest_dictionary[table].find(item => item.id == (id - magic_number_for_id));
    }

    return result;
}

function process_item_perks(perks) {
    let perks_found = [];

    //These mods in particular show up multiple times despite only being slotted once on any given item
    let elemental_charge_seen, font_of_might_seen, font_of_wisdom_seen, elemental_armaments_seen = false;

    for(let i = 0; i < perks.length; i++) {
        perk_info = JSON.parse(hash_lookup("DestinySandboxPerkDefinition", perks[i].perkHash).json);

        if(perk_info.displayProperties.name == undefined) {
            continue;
        }

        if(perk_info.displayProperties.name == "Elemental Charge") {
            if(elemental_charge_seen) {
                continue;
            }
            
            elemental_charge_seen = true;
        }

        if(perk_info.displayProperties.name == "Font of Might") {
            if(font_of_might_seen) {
                continue;
            }
            
            font_of_might_seen = true;
        }

        if(perk_info.displayProperties.name == "Font of Wisdom") {
            if(font_of_wisdom_seen) {
                continue;
            }
            
            font_of_wisdom_seen = true;
        }

        if(perk_info.displayProperties.name == "Elemental Armaments") {
            if(elemental_armaments_seen) {
                continue;
            }
            
            elemental_armaments_seen = true;
        }

        if(perk_info.displayProperties.name.includes("Frame")
            || perk_info.displayProperties.name.includes("Stat")) {
                continue;
        }

        perks_found.push("<b>" + perk_info.displayProperties.name + "</b>" + ": " + perk_info.displayProperties.description);
    }

    return perks_found;
}

function process_instance_info(item_instance_info, character_id, callback) {
    if(item_instance_info.item.data.itemHash == undefined) {
        return;
    }
    
    console.log(`Pulling data for item hash ${item_instance_info.item.data.itemHash}...`);
    item_info = JSON.parse(hash_lookup("DestinyInventoryItemDefinition", item_instance_info.item.data.itemHash).json);
    if(item_info.itemType != 2 && item_info.itemType != 3) {
        console.log(`Passing ${item_info.displayProperties.name}`);
        if(item_info.displayProperties.name == "Revenant") {
            console.log(item_instance_info.perks.data.perks);
            console.log(item_instance_info.stats.data.stats);//found stasis stats
        }
        return;
    }

    let perks_found = [];
    if(item_instance_info.perks.data != undefined) {
        perks_found = process_item_perks(item_instance_info.perks.data.perks);
    }
    
    let stats = item_instance_info.stats.data.stats;
    let stats_keys = Object.keys(stats);
    let stats_found = [];

    for(let i = 0; i < stats_keys.length; i++) {
        stat_info = JSON.parse(hash_lookup("DestinyStatDefinition", stats[stats_keys[i]].statHash).json);

        if(stat_info.displayProperties.name == undefined) {
            continue;
        }

        stats_found[stat_info.displayProperties.name] = stats[stats_keys[i]].value;
    }

    if(item_info.itemType == 2) {
        switch(item_info.itemSubType) {
            case 26:
                characters[character_id].helmet = {};
                characters[character_id].helmet.name = item_info.displayProperties.name;
                characters[character_id].helmet.icon = item_info.displayProperties.icon;
                characters[character_id].helmet.perk_list = perks_found;
                characters[character_id].helmet.stats_found = stats_found;
                break;
            case 27:
                characters[character_id].gloves = {};
                characters[character_id].gloves.name = item_info.displayProperties.name;
                characters[character_id].gloves.icon = item_info.displayProperties.icon;
                characters[character_id].gloves.perk_list = perks_found;
                characters[character_id].gloves.stats_found = stats_found;
                break;
            case 28:
                characters[character_id].chest = {};
                characters[character_id].chest.name = item_info.displayProperties.name;
                characters[character_id].chest.icon = item_info.displayProperties.icon;
                characters[character_id].chest.perk_list = perks_found;
                characters[character_id].chest.stats_found = stats_found;
                break;
            case 29:
                characters[character_id].boots = {};
                characters[character_id].boots.name = item_info.displayProperties.name;
                characters[character_id].boots.icon = item_info.displayProperties.icon;
                characters[character_id].boots.perk_list = perks_found;
                characters[character_id].boots.stats_found = stats_found;
                break;
            case 30:
                characters[character_id].class_item = {};
                characters[character_id].class_item.name = item_info.displayProperties.name;
                characters[character_id].class_item.icon = item_info.displayProperties.icon;
                characters[character_id].class_item.perk_list = perks_found;
                characters[character_id].class_item.stats_found = stats_found;
                break;
            default:
                return;
        }
    }

    if(item_info.itemType == 3) {
        switch(item_info.equippingBlock.equipmentSlotTypeHash) {
            case 1498876634:
                characters[character_id].kinetic = {};
                characters[character_id].kinetic.name = item_info.displayProperties.name;
                characters[character_id].kinetic.icon = item_info.displayProperties.icon;
                characters[character_id].kinetic.perk_list = perks_found;
                characters[character_id].kinetic.stats_found = stats_found;
                break;
            case 2465295065:
                characters[character_id].energy = {};
                characters[character_id].energy.name = item_info.displayProperties.name;
                characters[character_id].energy.icon = item_info.displayProperties.icon;
                characters[character_id].energy.perk_list = perks_found;
                characters[character_id].energy.stats_found = stats_found;
                break;
            case 953998645:
                characters[character_id].power = {};
                characters[character_id].power.name = item_info.displayProperties.name;
                characters[character_id].power.icon = item_info.displayProperties.icon;
                characters[character_id].power.perk_list = perks_found;
                characters[character_id].power.stats_found = stats_found;
                break;
            default:
                return;
        }
    }

    let character_keys = Object.keys(characters[character_id]);

    for(let i = 0; i < character_keys.length; i++) {
        if(characters[character_id][character_keys[i]] == undefined) {
            return;
        }
    }

    console.log("Building webpage...");
    build_webpage(character_id, callback);
}

function build_webpage(character_id, callback) {
    fs.readFile("./template.html", (error, data) => {
        let updatedPage = data.toString();

        updatedPage = updatedPage.replace(/#{kinetic_name}/g, characters[character_id].kinetic.name)
            .replace("#{kinetic_icon}", characters[character_id].kinetic.icon)
            .replace(/#{energy_name}/g, characters[character_id].energy.name)
            .replace("#{energy_icon}", characters[character_id].energy.icon)
            .replace(/#{power_name}/g, characters[character_id].power.name)
            .replace("#{power_icon}", characters[character_id].power.icon)
            .replace(/#{helmet_name}/g, characters[character_id].helmet.name)
            .replace("#{helmet_icon}", characters[character_id].helmet.icon)
            .replace(/#{gloves_name}/g, characters[character_id].gloves.name)
            .replace("#{gloves_icon}", characters[character_id].gloves.icon)
            .replace(/#{chest_name}/g, characters[character_id].chest.name)
            .replace("#{chest_icon}", characters[character_id].chest.icon)
            .replace(/#{boots_name}/g, characters[character_id].boots.name)
            .replace("#{boots_icon}", characters[character_id].boots.icon)
            .replace(/#{class_item_name}/g, characters[character_id].class_item.name)
            .replace("#{class_item_icon}", characters[character_id].class_item.icon)
            .replace("#{mobility_value}", characters[character_id].helmet.stats_found.Mobility
            + characters[character_id].gloves.stats_found.Mobility
            + characters[character_id].chest.stats_found.Mobility
            + characters[character_id].boots.stats_found.Mobility
            + characters[character_id].class_item.stats_found.Mobility)
            .replace("#{resilience_value}", characters[character_id].helmet.stats_found.Resilience
            + characters[character_id].gloves.stats_found.Resilience
            + characters[character_id].chest.stats_found.Resilience
            + characters[character_id].boots.stats_found.Resilience
            + characters[character_id].class_item.stats_found.Resilience)
            .replace("#{recovery_value}", characters[character_id].helmet.stats_found.Recovery
            + characters[character_id].gloves.stats_found.Recovery
            + characters[character_id].chest.stats_found.Recovery
            + characters[character_id].boots.stats_found.Recovery
            + characters[character_id].class_item.stats_found.Recovery)
            .replace("#{discipline_value}", characters[character_id].helmet.stats_found.Discipline
            + characters[character_id].gloves.stats_found.Discipline
            + characters[character_id].chest.stats_found.Discipline
            + characters[character_id].boots.stats_found.Discipline
            + characters[character_id].class_item.stats_found.Discipline)
            .replace("#{intellect_value}", characters[character_id].helmet.stats_found.Intellect
            + characters[character_id].gloves.stats_found.Intellect
            + characters[character_id].chest.stats_found.Intellect
            + characters[character_id].boots.stats_found.Intellect
            + characters[character_id].class_item.stats_found.Intellect)
            .replace("#{strength_value}", characters[character_id].helmet.stats_found.Strength
            + characters[character_id].gloves.stats_found.Strength
            + characters[character_id].chest.stats_found.Strength
            + characters[character_id].boots.stats_found.Strength
            + characters[character_id].class_item.stats_found.Strength);
        
        let character_keys = Object.keys(characters[character_id]);

        let perks_found;

        for(let i = 0; i < character_keys.length; i++) {
            perks_found = "";

            for(let j = 0; j < characters[character_id][character_keys[i]].perk_list.length; j++) {
                perks_found = perks_found + `<p>${characters[character_id][character_keys[i]].perk_list[j]}</p>`;
            }

            updatedPage = updatedPage.replace(`#{${character_keys[i]}_perks}`, perks_found);
        }

        fs.writeFile(`./characters/${character_id}.html`, updatedPage, (error) => {
            console.log(`Webpage ${character_id} written to 'characters' folder.`);
            delete characters[character_id];
            console.log(characters);
            callback(character_id);
        });
    });
}

function search_players(player_name, callback) {
    let id = player_name.replace(/#/g, "%23");
    request({ url: bungie_base_url + `/Platform/Destiny2/SearchDestinyPlayer/-1/${id}/`,
        headers: api_headers}, (error, response, body) => {
        if(error) {
            throw error;
        }

        let found_users = JSON.parse(body).Response;
        callback(found_users);
    });
}

function retrieve_characters(memType, memId, callback) {
    request({ url: bungie_base_url + `/Platform/Destiny2/${memType}/Profile/${memId}/?components=Characters`,
        headers: api_headers}, (error, response, body) => {
        if(error) {
            throw error;
        }
        if(JSON.parse(body).Response == undefined) {
            callback([], 404);
            return;
        }

        let found_characters = JSON.parse(body).Response.characters.data;
        let character_id_array = Object.keys(found_characters);
        let classes = [];
        for(let i = 0; i < character_id_array.length; i++) {
            let current_character = found_characters[character_id_array[i]];
            classes.push({
                name: JSON.parse(hash_lookup("DestinyClassDefinition", current_character.classHash).json).displayProperties.name,
                id: character_id_array[i]
            });
            //console.log(`${i}: ${classes[i]}`);
        }
        callback(classes);
    });
}

function create_snapshot(membership, profile_id, character_id, timestamp, callback) {
    request({ url: bungie_base_url + `/Platform/Destiny2/${membership}/Profile/${profile_id}/Character/${character_id}/?components=CharacterEquipment`,
        headers: api_headers}, (error, response, body) => {
            if(error) {
                throw error;
            }

            characters[`${profile_id}${character_id}${timestamp}`] = {
                kinetic: undefined,
                energy: undefined,
                power: undefined,
                helmet: undefined,
                gloves: undefined,
                chest: undefined,
                boots: undefined,
                class_item: undefined
            }

            let info = JSON.parse(body);
            let items = info.Response.equipment.data.items;
            items.forEach(item => {
                request({ url: bungie_base_url + `/Platform/Destiny2/${membership}/Profile/${profile_id}/Item/${item.itemInstanceId}/?components=ItemPerks,ItemStats,ItemInstances,ItemCommonData`,
                    headers: api_headers}, (error, response, body) => {
                    if(error) {
                        throw error;
                    }

                    let instance_info = JSON.parse(body).Response;
                    process_instance_info(instance_info, `${profile_id}${character_id}${timestamp}`, callback);
                });
            });
        });
}

async function compare_manifest_versions(downloaded_manifest, manifest_info) {
    if(downloaded_manifest.version != manifest_info.Response.version) {
        console.log("Need to update manifest version '" + downloaded_manifest.version + "' vs latest version '" + manifest_info.Response.version + "'.");

        request({ url: bungie_base_url + manifest_path, encoding: null }, (err, rsp, body) => {
            console.log("Downloading manifest.zip...");

            fs.writeFile("manifest.zip", body, "binary", async (err) => {
                console.log("Downloaded manifest.zip.");

                console.log("Extracting manifest.zip...");
                await extract("manifest.zip", { dir: __dirname }, (err) => {});
                console.log("Extracted manifest.zip.");

                downloaded_manifest.version = manifest_info.Response.version;
    
                console.log("Updating downloaded manifest version...");
                fs.writeFile(downloaded_manifest_file, JSON.stringify(downloaded_manifest), (error) => {
                    if(error) {
                        throw error;
                    }
                    console.log("Updated manifest version.");

                    build_db();
                });
            });
        });
    }
    else {
        console.log("Downloaded manifest is up to date.");

        initialize_manifest_dicionary();
    }
}

//Let's check the manifest info to see if it has been updated since we last downloaded it.
function startup(startup_callback) {
    web_server_startup_function = startup_callback;
    console.log("Checking latest manifest version...");
    request({ url: bungie_base_url + "/Platform/Destiny2/Manifest", headers: api_headers}, (error, response, body) => {
        if(error) {
            throw error;
        }

        let manifest_info = JSON.parse(body);
        manifest_path = manifest_info.Response.mobileWorldContentPaths.en;
    
        console.log("Checking downloaded manifest version...");
        fs.readFile(downloaded_manifest_file, (error, data) => {
            if(error) {
                if(error.errno = -4058) {
                    console.log("No downloaded manifest version saved, writing...");
                    fs.writeFile(downloaded_manifest_file, JSON.stringify({version:''}), (error) => {
                        if(error) {
                            throw error;
                        }

                        console.log("Downloaded manifest version saved.");
                        compare_manifest_versions({version:''}, manifest_info);
                    });
                }
                else {
                    throw error;
                }
            }
            else {
                compare_manifest_versions(JSON.parse(data), manifest_info);
            }
        })
    });
}

function build_db() {
    console.log("Extracting manifest tables...");
    let manifest_path_array = manifest_path.split('/');
    db = new sqlite.Database("./" + manifest_path_array[manifest_path_array.length - 1]);

    
    db.serialize(() => {
		let query = "SELECT name FROM sqlite_master WHERE type='table'";

		db.all(query, (error, rows) => {
			if(error) {
                throw error;
            }

            process_names(rows);
		});
    });
}

function process_names(names) {
    let processed_name = [];
    for (let i = 0; i < names.length; i++) {
        processed_name[i] = false;
        let query = `SELECT * FROM ${names[i].name}`;

        db.all(query, (error, rows) => {
            if (error) {
                throw error;
            }

            write_database_in_json(names[i].name, rows, () => {
                processed_name[i] = true;
                
                if(!processed_name.includes(false)) {
                    console.log("All tables extracted.");
                    db.close((error) => {
                        if(error) {
                            throw error;
                        }

                        let manifest_path_array = manifest_path.split('/');
                        try {
                            fs.unlinkSync("./" + manifest_path_array[manifest_path_array.length - 1]);
                            fs.unlinkSync("./manifest.zip");
    
                            console.log("Deleted downloaded manifest.");
                            initialize_manifest_dicionary();
                        }
                        catch (error) {
                            throw error;
                        }
                    });
                }
            });
        });
    }
}

function write_database_in_json(name, rows, callback) {
    fs.writeFile(`./manifest/${name}.json`, JSON.stringify(rows), (error) => {
        if (error) {
            throw error;
        }

        console.log(`Extracted ${name}`);

        callback();
    });
}

module.exports.character_startup = startup;
module.exports.search_players = search_players;
module.exports.retrieve_characters = retrieve_characters;
module.exports.create_snapshot = create_snapshot;
