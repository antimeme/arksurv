(function(ark) {
    // Schema:
    // "Recipe Item": {
    //     "station": string or null, // crafting station required
    //     "weight": number, // units of carrying weight for one item
    //     "level": number, // character level required to learn
    //     "ep": number, // engram points required
    //     "xp": number, // experience for crafting
    //     "time": number, // seconds to craft, cook or gather
    //     "prereq": [ string, ... ] // engrams needed to unlock
    //     "ingredients": {
    //         "Item1": integer,
    //         "Item2": integer,
    //         ...
    //     }
    // },

    
    ark.recipes = undefined;

    ark.setup = function($, action) {
        $.ajax({
            url: 'ark.json',
            dataType: 'json',
            cache: false,
            beforeSend: function(xhr) {
                // Without this browsers give confusing warnings about
                // content type mismatches when using a file:// URL.
                if (xhr.overrideMimeType)
                    xhr.overrideMimeType("application/json");
            }
        }).done(function(data) {
            var value = JSON.parse(data);
            ark.recipes = value.recipes;
            if (action)
                action($);
        });
    }
    
    ark.cost = function(items, engrams) {
        // :BUG: prerequisites are not considered for engram total
        if (!ark.recipes)
            throw "Recipies not loaded";
        var result = { stations: {}, level: 0, xp: 0, ep: 0,
                       ingredients: {} };
        var item_name, recipe, ingredient, crafts, found;
        var station, subingredient, subitems, subresult;

        if (typeof(engrams) === 'undefined')
            engrams = {};

        for (item_name in items) {
            recipe = ark.recipes[item_name];
            if (!recipe) {
                console.log("Unknown recipe:", item_name);
                break;
            }

            crafts = recipe.crafts ? recipe.crafts : 1;
            if (recipe.level && recipe.level > result.level)
                result.level = recipe.level;
            if (recipe.xp)
                result.xp += recipe.xp * items[item_name] / crafts;
            if (recipe.ep && !(recipe in engrams))
                result.ep += recipe.ep;
            if (recipe.station) {
                found = false;
                for (station in recipe.station)
                    if (recipe.station[station] in result.stations)
                        found = true;
                if (!found)
                    result.stations[recipe.station[0]] = true;
            }
            for (ingredient in recipe.ingredients) {
                if (ingredient in ark.recipes) {
                    subitems = {};
                    subitems[ingredient] =
                        recipe.ingredients[ingredient] *
                        items[item_name] / crafts;
                    subresult = ark.cost(subitems, engrams);
                    result.xp += subresult.xp;
                    result.ep += subresult.ep;
                    if (result.level < subresult.level)
                        result.level = subresult.level

                    for (station in subresult.stations)
                        result.stations[station] = true;
                    for (subingredient in subresult.ingredients) {
                        if (!result.ingredients[subingredient])
                            result.ingredients[subingredient] = 0;
                        result.ingredients[subingredient] +=
                            subresult.ingredients[subingredient];
                    }
                } else {
                    if (!result.ingredients[ingredient])
                        result.ingredients[ingredient] = 0;
                    result.ingredients[ingredient] +=
                        recipe.ingredients[ingredient] *
                        items[item_name] / crafts;
                }
            }
        }
        return result;
    };
})(typeof exports === 'undefined'? this['ark'] = {}: exports);

// Entry point for command line use.
if ((typeof require !== 'undefined') && (require.main === module)) {
    var ark = exports;
    var profiles = {
        metalBox: {
            "Metal Foundation": 1,
            "Metal Wall": 3,
            "Metal Doorframe": 1,
            "Metal Door": 1,
            "Metal Ceiling": 1,
        },
        baseBoat: {
            "Wooden Raft": 1,
            "Stone Foundation": 8,
            "Stone Ceiling": 9,
            "Stone Wall": 10,
            "Stone Doorframe": 2,
            "Reinforced Wooden Door": 2,
            "Stone Windowframe": 2,
            "Reinforced Window": 2,
            "Stone Hatchframe": 2,
            "Reinforced Trapdoor": 2,
            "Stone Railing": 10,
            "Wooden Ramp": 5,
            "Wooden Ladder": 1,
            "Simple Bed": 1,
            "Storage Box": 4,
            "Campfire": 1,
            "Refining Forge": 1,
            "Smithy": 1,
            "Preserving Bin": 1,
            "Mortar And Pestle": 1,
            "Compost Bin": 1,
            "Large Crop Plot": 2,
            "Small Crop Plot": 5,
            "Flare Gun": 2
        },
        equip: {
            "Hide Pants": 1,
            "Hide Shirt": 1,
            "Hide Boots": 1,
            "Hide Gloves": 1,
            "Hide Hat": 1,
            "Metal Sword": 1,
            "Metal Pick": 1,
            "Metal Hatchet": 1,
            "Torch": 1,
            "Shotgun": 1,
            "Crossbow": 1,
            "Tranquilizer Arrow": 10,
            "Simple Shotgun Ammo": 20,
            "Spyglass": 1,
            "Parachute": 2
        }
    };

    ark.setup({ajax: function(config) {
        var self = this;
        var fs = require('fs');
        fs.readFile(config.url, function(err, data) {
            var ii;
            if (err) throw err;
            if (self.actions)
                for (ii in self.actions)
                    self.actions[ii](data);
        });
        return this;
    }, done: function(action) {
        if (!this.actions)
            this.actions = [];
        this.actions.push(action);
    }}, function() {
        var ii, data, targets = process.argv.slice(2);
        if (!targets.length)
            targets = ["equip"];

        for (ii in targets) {
            try {
                console.log(targets[ii], ":",
                            ark.cost(JSON.parse(targets[ii])));
            } catch (e) {
                if (e instanceof SyntaxError)
                    console.log(targets[ii], ":",
                                ark.cost(profiles[targets[ii]]));
                else throw e;
            }
        }
    });
}
