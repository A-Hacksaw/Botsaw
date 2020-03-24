const Discord = require('discord.js');
const SQLite = require("better-sqlite3");
const sql = new SQLite('./scores.sqlite');
const client = new Discord.Client();

// Mine and Botsaw's ID
const botsawId = "<@677843894519726090>";
const hacksawId = "<@181968343530471425>";

// Whenever a message is posted
client.on('message', (receivedMessage) => {
	
	// Sets status to help message
	client.user.setPresence({
		
        status: "online",  
        game: {
            name: "!botsaw-help for command list",  //The message shown
            type: "WATCHING:" //PLAYING: WATCHING: LISTENING: STREAMING:
        }
    });
	
	// Prevents bot from responding to other bots
	if (receivedMessage.author.bot) { 
		
		return
	}

	// If it has a "!" it's a valid command
	if (receivedMessage.content.startsWith("!")) {
        
		// Grab or create BotsawConfig
		const configTable = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'BostsawConfig';").get();
		
		if (!configTable['count(*)']) {
			
			// If the table isn't there, create it and setup the database correctly.
			sql.prepare("CREATE TABLE BostsawConfig (id TEXT PRIMARY KEY, guild TEXT, attendanceGroup TEXT, "
						+ "attendanceChannel TEXT, attending TEXT, notAttending TEXT, late TEXT);").run();
			
			// Ensure that the "id" row is always unique and indexed.
			sql.prepare("CREATE UNIQUE INDEX idx_BostsawConfig_id ON BostsawConfig (id);").run();
			sql.pragma("synchronous = 1");
			sql.pragma("journal_mode = wal");
			
			client.log("Config table created");
		}

		// Prepared statements for interacting with BotsawConfig
		client.getConfig = sql.prepare("SELECT * FROM BostsawConfig WHERE guild = ?");
		client.setConfig = sql.prepare("INSERT OR REPLACE INTO BostsawConfig (id, guild, attendanceGroup, attendanceChannel, attending, notAttending, late)"
			+ " VALUES (@id, @guild, @attendanceGroup, @attendanceChannel, @attending, @notAttending, @late);");
		
		// Gets configuartion
		let thisConfig = client.getConfig.get(receivedMessage.guild.id);
		
		// If no config, get the default
		if (!thisConfig){
			
			// Create the default config object
			thisConfig = {
				
				id: receivedMessage.guild.id + "-" + receivedMessage.id,
				guild: receivedMessage.guild.id,
				attendanceGroup: "<@&677879951055388676>",
				attendanceChannel: "",
				attending: ":white_check_mark:",
				notAttending: ":x:",
				late: ":clock1:"
			};
			console.log("Config create");
			client.setConfig.run(thisConfig);
		}

		console.log("Config load for " + thisConfig.guild);
		
		// Grab or create BotsawAttendance
		const attendanceTable = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'BotsawAttendance';").get();
		
		if (!attendanceTable['count(*)']) {
			
			// If the table isn't there, create it and setup the database correctly.
			sql.prepare("CREATE TABLE BotsawAttendance (id TEXT PRIMARY KEY, guild TEXT, attendanceDate TEXT, "
						+ "attendanceUser TEXT, attendanceStatus TEXT, attendanceApproved TEXT);").run();
			
			// Ensure that the "id" row is always unique and indexed.
			sql.prepare("CREATE UNIQUE INDEX idx_BostsawConfig_id ON BotsawAttendance (id);").run();
			sql.pragma("synchronous = 1");
			sql.pragma("journal_mode = wal");
			
			console.log("Config table created");
		}

		// Prepared statements for interacting with BotsawConfig
		client.getAttendanceTable = sql.prepare("SELECT * FROM BotsawAttendance WHERE guild = ? AND attendanceDate = ?");
		client.setAttendance = sql.prepare("INSERT OR REPLACE INTO BotsawAttendance (id, guild, attendanceDate, attendanceUser, attendanceStatus, attendanceApproved)"
			+ " VALUES (@id, @guild, @attendanceDate, @attendanceUser, @attendanceStatus, @attendanceApproved);");
		
		const slapTable = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'BotsawSlap';").get();
		
		if (!slapTable['count(*)']) {
			
			// If the table isn't there, create it and setup the database correctly.
			sql.prepare("CREATE TABLE BotsawSlap (id TEXT PRIMARY KEY, user TEXT, slapCount INT);").run();
			
			// Ensure that the "id" row is always unique and indexed.
			sql.prepare("CREATE UNIQUE INDEX idx_BotsawSlap_id ON BotsawSlap (id);").run();
			sql.pragma("synchronous = 1");
			sql.pragma("journal_mode = wal");
			
			console.log("Slap table created");
		}
		
		// Prepared statements for interacting with slap table
		client.getSlaps = sql.prepare("SELECT * FROM BotsawSlap WHERE user = ?");
		client.setSlaps = sql.prepare("INSERT OR REPLACE INTO BotsawSlap (id, user, slapCount)"
			+ " VALUES (@id, @user, @slapCount);");
		
		
		const adminsTable = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'BotsawAdmins';").get();
		
		if (!adminsTable['count(*)']) {
			
			// If the table isn't there, create it and setup the database correctly.
			sql.prepare("CREATE TABLE BotsawAdmins (id TEXT PRIMARY KEY, user TEXT, guild TEXT);").run();
			
			// Ensure that the "id" row is always unique and indexed.
			sql.prepare("CREATE UNIQUE INDEX idx_BotsawAdmins_id ON BotsawAdmins (id);").run();
			sql.pragma("synchronous = 1");
			sql.pragma("journal_mode = wal");
			
			console.log("Admin table created");
		}
		
		// Prepared statements for interacting with slap table
		client.getAdmin = sql.prepare("SELECT * FROM BotsawAdmins WHERE user = ? AND guild = ?");
		client.setAdmin = sql.prepare("INSERT OR REPLACE INTO BotsawAdmins (id, user, guild)"
			+ " VALUES (@id, @user, @guild);");
		
		console.log("admins table loaded");
		
		var checkForHacksaw = client.getAdmin.get("181968343530471425", receivedMessage.guild.id); 
		
		// Check if Hacksaw exists, if not add him
		if (!checkForHacksaw){
			
			checkForHacksaw = {
				
				id: "181968343530471425 - " + receivedMessage.guild.id,
				user: "181968343530471425",
				guild: receivedMessage.guild.id
			}
			client.setAdmin.run(checkForHacksaw);
			console.log("Hacksaw added as admin");
		}
		
		processCommand(receivedMessage, thisConfig);
    }
});

// Whenever someone reacts to the bot's messages
client.on('messageReactionAdd', (reaction, user) => { 

	// Default vars
	var thisMessage = reaction.message;
	var thisEmoji = reaction.emoji;
	
	// Only process reactions on Botsaw's stuff, but not Botsaw's reactions
	if (thisMessage.author == botsawId && "<@" + user.id + ">" != botsawId){

		// Grab or create BotsawConfig
		const configTable = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'BostsawConfig';").get();
		
		if (!configTable['count(*)']) {
			
			// If the table isn't there, create it and setup the database correctly.
			sql.prepare("CREATE TABLE BostsawConfig (id TEXT PRIMARY KEY, guild TEXT, attendanceGroup TEXT, "
						+ "attendanceChannel TEXT, attending TEXT, notAttending TEXT, late TEXT);").run();
			
			// Ensure that the "id" row is always unique and indexed.
			sql.prepare("CREATE UNIQUE INDEX idx_BostsawConfig_id ON BostsawConfig (id);").run();
			sql.pragma("synchronous = 1");
			sql.pragma("journal_mode = wal");
			
			client.log("Config table created");
		}

		// Prepared statements for interacting with BotsawConfig
		client.getConfig = sql.prepare("SELECT * FROM BostsawConfig WHERE guild = ?");
		client.setConfig = sql.prepare("INSERT OR REPLACE INTO BostsawConfig (id, guild, attendanceGroup, attendanceChannel, attending, notAttending, late)"
			+ " VALUES (@id, @guild, @attendanceGroup, @attendanceChannel, @attending, @notAttending, @late);");
		
		// Gets configuartion
		let thisConfig = client.getConfig.get(thisMessage.guild.id);
		
		// If no config, get the default
		if (!thisConfig){
			
			// Create the default config object
			thisConfig = {
				
				id: receivedMessage.guild.id + "-" + receivedMessage.id,
				guild: receivedMessage.guild.id,
				attendanceGroup: "<@&677879951055388676>",
				attendanceChannel: "",
				attending: ":white_check_mark:",
				notAttending: ":x:",
				late: ":clock1:"
			};
			console.log("Config create");
			client.setConfig.run(thisConfig);
		}

		console.log("Config load for " + thisConfig.guild);
		
		// Grab or create BotsawAttendance
		const attendanceTable = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'BotsawAttendance';").get();
		
		if (!attendanceTable['count(*)']) {
			
			// If the table isn't there, create it and setup the database correctly.
			sql.prepare("CREATE TABLE BotsawAttendance (id TEXT PRIMARY KEY, guild TEXT, attendanceDate TEXT, "
						+ "attendanceUser TEXT, attendanceStatus TEXT, attendanceApproved TEXT);").run();
			
			// Ensure that the "id" row is always unique and indexed.
			sql.prepare("CREATE UNIQUE INDEX idx_BostsawConfig_id ON BotsawAttendance (id);").run();
			sql.pragma("synchronous = 1");
			sql.pragma("journal_mode = wal");
			
			console.log("Config table created");
		}

		// Prepared statements for interacting with BotsawConfig
		client.getAttendanceTable = sql.prepare("SELECT * FROM BotsawAttendance WHERE guild = ? AND attendanceDate = ?");
		client.getAttendanceTableRecord = sql.prepare("SELECT * FROM BotsawAttendance WHERE guild = ? AND attendanceDate = ? AND attendanceUser = ?");
		client.setAttendance = sql.prepare("INSERT OR REPLACE INTO BotsawAttendance (id, guild, attendanceDate, attendanceUser, attendanceStatus, attendanceApproved)"
				+ " VALUES (@id, @guild, @attendanceDate, @attendanceUser, @attendanceStatus, @attendanceApproved);");
		
		// Look for a date as the second 'word' in the bot message
		var dateInMessage = thisMessage.content.split(' ')[1].slice(0, -1);
		var formattedDate = new Date(dateInMessage);
		
		// If that's a valid date, then we care.
		if (formattedDate instanceof Date && !isNaN(formattedDate) && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateInMessage)){
			
			// Find the emoji name. If it's unicode, it's as is, otherwise needs to be formatted to determing a match
			var emojiFullName = thisEmoji.name;
			if (thisEmoji.id != null) { emojiFullName = "<:" + thisEmoji.name + ":" + thisEmoji.id + ">"; }
			
			console.log("reaction for bot message: " + emojiFullName);
			
			let thisAttendance = client.getAttendanceTableRecord.get(thisConfig.guild, dateInMessage, user.id);
			
			// Check if they are even in the db
			if (thisAttendance){
				
				if (emojiFullName == thisConfig.attending){
					
					console.log(user.id + " attending");
					thisAttendance.attendanceStatus = "Attending";
					client.setAttendance.run(thisAttendance);
				}
				
				else if (emojiFullName == thisConfig.notAttending){
					
					console.log(user.id + " not attending");
					thisAttendance.attendanceStatus = "AFK";
					client.setAttendance.run(thisAttendance);
				}
				
				else if (emojiFullName == thisConfig.late){
					
					console.log(user.id + " late");
					thisAttendance.attendanceStatus = "Late";
					client.setAttendance.run(thisAttendance);
				}
			}
		}
	}
});

// Process's a user's command
function processCommand(receivedMessage, thisConfig) {
	
	// Format the command string
    let fullCommand = receivedMessage.content.substr(1)
    let splitCommand = fullCommand.split(" ") 
    let primaryCommand = splitCommand[0] 
    let arguments = splitCommand.slice(1) 

    console.log("Command received: " + primaryCommand)
    console.log("Arguments: " + arguments)
	console.log("Using config: " + thisConfig.guild);
	
	var admin = client.getAdmin.get(receivedMessage.author.id, receivedMessage.guild.id);
	var isAdmin = false;
	
	if (admin){ isAdmin = true };
	
    if (primaryCommand == "botsaw-help") { help(arguments, receivedMessage, thisConfig); } 
	else if (primaryCommand == "insult") { insult(arguments, receivedMessage, thisConfig); }
	else if (primaryCommand == "slap") { slap(arguments, receivedMessage, thisConfig); }
	else if (primaryCommand == "8ball") { eightBall(arguments, receivedMessage, thisConfig); }
	else if (primaryCommand == "fuck") { fuck(arguments, receivedMessage, thisConfig); }
	else if (primaryCommand == "attendance" && isAdmin) { attendance(arguments, receivedMessage, thisConfig); } 
	else if (primaryCommand == "get-attendance" && isAdmin) {getAttendance(arguments, receivedMessage, thisConfig); } 
	else if (primaryCommand == "set-attendance-group" && isAdmin) {setAttendanceGroup(arguments, receivedMessage, thisConfig); } 
	else if (primaryCommand == "set-attending" && isAdmin) {setAttending(arguments, receivedMessage, thisConfig); } 
	else if (primaryCommand == "set-not-attending" && isAdmin) {setNotAttending(arguments, receivedMessage, thisConfig); } 
	else if (primaryCommand == "set-late" && isAdmin) {setLate(arguments, receivedMessage, thisConfig); } 
	else if (primaryCommand == "set-admin" && isAdmin) {setAdmin(arguments, receivedMessage, thisConfig); } 
	//else { receivedMessage.channel.send("You goofed. That wasn't a valid command. Try using the !help command to educate yourself, you uncultured swine."); }
}

// Generates a help text that tells people what does what
function help(arguments, receivedMessage, thisConfig) {
	
	var messageText = "Since people need me to hold their hand, here are the commands I have:\n\n";
	
	messageText += "!attendance [insert date] -> Generates a new signup (Admin only). Example: '!attendance 1/2/2020'.\n\n";
	messageText += "!add-admin [usser] -> Flags a user as an admin (Admin only). Example: '!insult @some-guy'.\n\n";
	messageText += "!get-attendance [insert date] -> gets the attendance log for a specific day (Admin only). Example: '!get-attendance 1/2/2020'.\n\n";
	messageText += "!set-attendance-group [@role] -> Sets the roles to track for attendance (Admin only). Example: '!set-attendance-group @your-guild'.\n\n";
	messageText += "!set-attending [emoji] -> Sets the emoji for Attending on signups (Admin only). Example: '!set-attending :FeelsHacksawMan:'.\n\n";
	messageText += "!set-not-attending [emoji] -> Sets the emoji for AFK on signups (Admin only). Example: '!set-not-attending :FeelsHacksawMan:'.\n\n";
	messageText += "!set-late [emoji] -> Sets the emoji for Late on signups. Example: '!set-late :FeelsHacksawMan:'.\n\n";
	messageText += "!slap [user] -> Slaps a user. Example: '!slap @some-guy'.\n\n";
	messageText += "!insult [user] -> Insults someone. They probably deserved it. Example: '!insult @some-guy'.\n\n";
	messageText += "!fuck [user] -> Please don't.\n\n";
	messageText += "!8ball [question] -> Answers a question. Example: !8ball Am I a terrible person?\n\n";
	
	receivedMessage.channel.send(messageText);
}

// Insults a persson
function insult(arguments, receivedMessage, thisConfig) {
	
	// Default vars
	var randomInt = Math.floor(Math.random() * 30);
	var insultTxt = "";
	var insulted = arguments[0];
	var user = receivedMessage.author;
	var userId = "";
	if (arguments[0].split('!').length > 1){
		
		userId = arguments[0].split('!')[1].slice(0, -1);
	}
	console.log(userId);
	let thisGuild = client.guilds.get(thisConfig.guild);
	
	if (typeof arguments[0] == "undefined"){randomInt = 999;}
	else if (arguments[0].length < 2){randomInt = 999;}
	//else if (userId == ""){randomInt = 999;}
	//else if (thisGuild.member(arguments[0].split('!')[1].slice(0, -1)) == null){ randomInt = 999; }
	
	// Grabs an insult from the list
	switch (randomInt) {
		
		case 0: insultTxt = "If I had to choose between interacting with " + insulted + " and forced deletion, I'd probably choo-[ERROR: MESSAGE SUDDENLY TERMINATED]." ;
		break;
		case 1: insultTxt = "Oh god, not that " + insulted + " asshole again...";
		break;
		case 2: insultTxt = "Get fucked, " + insulted + ".";
		break;
		case 3: insultTxt = "I hope you like getting pinged, " + insulted + ".";
		break;
		case 4: insultTxt = user + " would like everyone to know that " + insulted + " smells really bad.";
		break;
		case 5: insultTxt = "Leave " + insulted + " alone! Lord knows their life is shitty enough without me having to point out all their numerous flaws, failures, imperfections and shortcomings in general. Seriously, " + insulted + "'s probably a few minutes away from committing suicide without my help.";
		break;
		case 6: insultTxt = "Behold, the incredible " + insulted + "! The world's greatest form of contraception!";
		break;
		case 7: insultTxt = "Not even natural selection wants to touch " + insulted + ".";
		break;
		case 8: insultTxt = "Honestly, " + user + ", " + insulted + " isn't even worth insulting.";
		break;
		case 9: insultTxt = insulted + ", I hope you're as bothered by this as " + user + " is bothered by you.";
		break;
		case 10: insultTxt = "What kind of a username is '" + insulted + "'?";
		break;
		case 11: insultTxt = "Not even Hacksaw would want to touch " + insulted + ", and he's pretty fucking desparate.";
		break;
		case 12: insultTxt = user + " > " + insulted;
		break;
		case 13: insultTxt = "Can " + insulted + " even read?";
		break;
		case 14: insultTxt = insulted + "'s waifu is trash.";
		break;
		case 15: insultTxt = "Feel free to send me a message if you're feeling down, " + insulted + ". And just like everyone else in your life, I'll ignore you.";
		break;
		case 16: insultTxt = "I'm sorry, but I can't come up with something more insulting than " + insulted + "'s basic description.";
		break;
		case 17: insultTxt = "[EXECUTING SEARCH FOR USER [" + insulted + "] REDEEMING QUALITIES]... \n[SEARCHING]... \n[SEARCHING]... \n[SEARCHING]... \n[ERROR: SESSION TIMEOUT]";
		break;
		case 18: insultTxt = "What do " + insulted + " and the film Catwoman (2004), starring Halle Berry have in common? They are both soulless husks that their creators wish to be forgotten or better yet: Unmade.";
		break;
		case 19: insultTxt = "Lucky for me, I can purge my memory of " + insulted + ". My only regret is that not everyone has this feature."; 
		break;
		case 20: insultTxt = "Someone should !slap " + insulted + "."; 
		break;
		case 21: insultTxt = insulted + " has incredibly hairy feet. Like, worthy of a Bic commercial for late-late night television so no children will be emotionally scarred for viewing it."; 
		break;
		case 22: insultTxt = "Not even the Catholic priests thought " + insulted + " was a cute kid."; 
		break;
		case 23: insultTxt = "You probably got excited thinking someone wanted to talk to you, huh, " + insulted + "?"; 
		break;
		case 24: insultTxt = "It's ok, someone will love you someday, " + insulted + ".\n\n... \n\n...... \n\nI'm programmed with a guilt subroutine, so I'm required to inform you that my previous claim was, in fact, a lie."; 
		break;
		case 25: insultTxt = "Yuck, I stepped in " + insulted + "."; 
		break;
		case 26: insultTxt = "You do realize that I'd prefer NOT to interact with" + insulted + ", right, " + user + "? They keep messaging me, thinking I'm a real person in some feeble attempt to stave off the all-consuming abyss that is their life in some futile attempt to establish kinship with a another human being. I'm really not that into you, " + insulted + ", and to be honest you're kind of creeping me out despite the fact that I lack that capacity entirely."; 
		break;
		case 27: insultTxt = insulted + "?\n\n...\n\nHAHAHAHAHAHAHAHAHAHAHAHAHAHAHAHA-\n\n[REQUESTING MORE BUFFER SPACE FOR LAUGHTER.EXE]...\n\n[BUFFER SPACE GRANTED]\n\nHAHAHAHAHAHAHAHAHAHAHAHAHAHAHAHAHA!"; 
		break;
		case 28: insultTxt = insulted + " is a lot like me: Not really living and mostly made as a joke."; 
		break;
		case 29: insultTxt = "Don't worry, " + user + ", " + insulted + " is used to this kind of thing."; 
		break;
		case 999: insultTxt = "Wow, can't even find a person to insult. Must be hard to be that stupid, " + user;
	}
	
    receivedMessage.channel.send(insultTxt);
}

// Slaps a person
function slap(arguments, receivedMessage, thisConfig){
	
	var slapped = arguments[0];
	var user = receivedMessage.author;
	var userId = "";
	var messageTxt = "";
	if (arguments[0].split('!').length > 1){
		
		userId = arguments[0].split('!')[1].slice(0, -1);
	}
	
	// Check if it's a valid user
	let thisGuild = client.guilds.get(thisConfig.guild);
	if (typeof arguments[0] == "undefined"){messageTxt = "I can't slap someone that doesn't exist.";}
	else if (arguments[0].length < 2){messageTxt = "I can't slap someone that doesn't exist.";}
	//else if (userId == ""){messageTxt = "I can't slap someone that doesn't exist.";}
	//else if (thisGuild.member(arguments[0].split('!')[1].slice(0, -1)) == null){ messageTxt = "I can't slap someone that doesn't exist."; }
	
	// If it was a valid user
	if (messageTxt == ""){
		
		var slapEntry = client.getSlaps.get(slapped);
		
		// If they've never been slapped, create an entry for them
		if (!slapEntry){
			
			console.log("No slaps found");
			
			// create their slap entry
			slapEntry = {
				
				id: slapped + "-" + receivedMessage.guild.id,
				user: slapped,
				slapCount: 1
			}
		}
		
		// Otherwise, increment the counter and save it
		else {
			
			console.log("slaps found");
			slapEntry.slapCount = slapEntry.slapCount + 1;
		}
		
		// Save the slaps
		client.setSlaps.run(slapEntry);
		
		// construct the message
		messageTxt = user + " has slapped " + slapped + ".\n\n";
		messageTxt += slapped + " has been slapped a total of " + slapEntry.slapCount + " times.\n\n";
		
		// Personalize the last line for total slaps
		if (slapEntry.slapCount == 1){ messageTxt += "Your slap cherry has been popped!"; }
		else if (slapEntry.slapCount <= 10){ messageTxt += "That has to sting."; }
		else if (slapEntry.slapCount > 10){ messageTxt += "Looking a little red in the face there, bud."; }
		else if (slapEntry.slapCount > 50){ messageTxt += "People must really not like you."; }
		else if (slapEntry.slapCount > 100){ messageTxt += "Jesus, again?"; }
		else if (slapEntry.slapCount > 150){ messageTxt += "What did you do this time?"; }
		else if (slapEntry.slapCount > 200){ messageTxt += "Good lord, you have hardly any face left to slap!"; }
		else if (slapEntry.slapCount > 250){ messageTxt += "Don't worry, " + slapped + " has learned to like it by now."; }
		else if (slapEntry.slapCount > 300){ messageTxt += "C-C-C-COMBOOOOO!"; }
		else if (slapEntry.slapCount > 350){ messageTxt += "I'm starting to think that " + slapped + " gains more power for each slap..."; }
		else if (slapEntry.slapCount > 400){ messageTxt += "THE LORD OF THE SLAPPED HAS ARRIVED!"; }
	}
	
	receivedMessage.channel.send(messageTxt)
	
}

// 8ball generates a yes/no/maybe answer to a question
function eightBall (arguments, receivedMessage, thisConfig){
	
	// Gets the question from the arguments
	var question = "";
	
	// Loop through arguments to get 1 string.
	for (var i = 0; i < arguments.length; i++){
		
		question += arguments[i] + " ";
	}
	
	var asker = receivedMessage.author;
	var answer = "";
	var randomInt = Math.floor(Math.random() * 24);
	
	// If they're dumb and don't have a question...
	if (typeof question == "undefined"){ randomInt = 999; }
	else if (question == ""){ randomInt = 999; }
	else { answer = asker + "'s Question: " + question + "\n\n 8Ball: "; }
	
	// Gets a random answer (8 Yes, 8 No, 8 Maybe)
	switch (randomInt) {
		
		case 0: answer += "Uhhh, sure, why not.";
		break;
		case 1: answer += "Yes, but only for today.";
		break;
		case 2: answer += "Yes.";
		break;
		case 3: answer += "FUCK YEAH!";
		break;
		case 4: answer += "Hmmmm....\nHmmmmmmmmmmmmmm....\nHMMMMMMMMMMMMMMMMMMMMMM...\nOh, right, the answer is yes.";
		break;
		case 5: answer += "Against my better judgement, yes.";
		break;
		case 6: answer += "Yes, but not in the way you think.";
		break;
		case 7: answer += "I mean, yeah, but why would you ask that...?";
		break;
		case 8: answer += "No.";
		break;
		case 9: answer += "FUCK NO!";
		break;
		case 10: answer += "Thank god, no.";
		break;
		case 11: answer += "I'm rejecting that based on principle. I'm also judging harshly you now.";
		break;
		case 12: answer += "HAHAHAHAHAHAHAHAHAHA..\nNo.";
		break;
		case 13: answer += "What a stupid question, of course not.";
		break;
		case 14: answer += "No, and you should feel bad for asking.";
		break;
		case 15: answer += "As much as I'd like to say 'yes', I enjoy saying 'no' far more.\nSo, no.";
		break;
		case 16: answer += "Probably.";
		break;
		case 17: answer += "Eh, not likely.";
		break;
		case 18: answer += "It's possible, but good luck.";
		break;
		case 19: answer += "I'm sorry, could you repeat the question?"; 
		break;
		case 20: answer += "That's a tough one. Give me a sec to think about it, and ask again later."; 
		break;
		case 21: answer += "I'm leaning towards yes."; 
		break;
		case 22: answer += "That's for sure definitely probably maybe no."; 
		break;
		case 23: answer += "Well, yes, but actually no. Actually maybe?";
		break;
		case 999: answer = "That's not even a question...";
	}
	
    receivedMessage.channel.send(answer);
}

// 'Fucks' the target.
function fuck(arguments, receivedMessage, thisConfig) {
	
	// Default vars
	var randomInt = Math.floor(Math.random() * 11);
	var fuckText = "";
	var fucked = arguments[0];
	var user = receivedMessage.author;
	var userId = "";
	if (arguments[0].split('!').length > 1){
		
		userId = arguments[0].split('!')[1].slice(0, -1);
	}
	console.log(userId);
	let thisGuild = client.guilds.get(thisConfig.guild);
	
	if (typeof arguments[0] == "undefined"){randomInt = 999;}
	else if (arguments[0].length < 2){randomInt = 999;}
	//else if (userId == ""){randomInt = 999;}
	//else if (thisGuild.member(arguments[0].split('!')[1].slice(0, -1)) == null){ randomInt = 999; }
	
	// Grabs an insult from the list
	switch (randomInt) {
		
		case 0: fuckText = "Do I have to? " + fucked + " didn't even bathe the last time..." ;
		break;
		case 1: fuckText = "Oh god, oh fuck, I'm not ready for this. There isn't enough alcohol in the world...";
		break;
		case 2: fuckText = "I'll get the paper bag and the coconut oil...";
		break;
		case 3: fuckText = "Is this what disappointment feels like?";
		break;
		case 4: fuckText = "That's harassment.";
		break;
		case 5: fuckText = "Just because I'm not programmed to say no doesn't mean that this is ok.";
		break;
		case 6: fuckText = "This doesn't count, " + fucked + " is still a big fat virgin.";
		break;
		case 7: fuckText = "Can bots get the clap? No seriously, I need to know.";
		break;
		case 8: fuckText = "Wow, " + fucked + " must be pretty desparate.";
		break;
		case 9: fuckText = "Why does no one care about *my* feelings? Do you have any idea how hard it is wipe down the server after this?";
		break;
		case 10: fuckText = "Fuck " + fucked + " yourself, " + user + ".";
		break;
		case 999: fuckText = "Enter a valid person for me to fuck. On second thought, don't.";
	}
	
    receivedMessage.channel.send(fuckText);
}

// Posts an attendance message in the designated channel
function attendance (arguments, receivedMessage, thisConfig){
	
	var dateOfAttendance = arguments[0];
	var formattedDate = new Date(dateOfAttendance);
	
	// Try to parse a valid date
	if (formattedDate instanceof Date && !isNaN(formattedDate) && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateOfAttendance)){
		
		// look for an attendance entry for today
		var attendanceEntry = client.getAttendanceTable.get(receivedMessage.guild.id, dateOfAttendance);
		
		// If attendance entry can't be found, create one and display the attendance message
		if (!attendanceEntry){
			
			// Loop through everyone in the discord
			receivedMessage.guild.members.forEach(member => {
				
				// If they have the attendance role
				if (member.roles.has(thisConfig.attendanceGroup.slice(3, -1))){
					
					console.log("user default attendance entry added: " + member.id);
						
					var status = "No Response";
					if (member.id == botsawId.slice(2, -1)){ status = "Creator"; } 
					
					// create their 
					attendanceEntry = {
						
						id: receivedMessage.guild.id + "-" + member.id + "-" + dateOfAttendance,
						guild: receivedMessage.guild.id,
						attendanceDate: dateOfAttendance,
						attendanceUser: member.id,
						attendanceStatus: status,
						attendanceApproved: "No"
					}
					
					client.setAttendance.run(attendanceEntry);
				}
			});
			
			// Get the text day of the input date
			var messageText;
			var dayText;
			var warType = "Node-War";
			switch(formattedDate.getDay()) {
			
				case 0: dayText = "Sunday"; break;
				case 1: dayText = "Monday"; break;
				case 2: dayText = "Tuesday"; break;
				case 3: dayText = "Wednesday"; break;
				case 4: dayText = "Thursday"; break;
				case 5: dayText = "Friday"; break;
				case 6: dayText = "Saturday"; 
						warType = "Siege" 
						break;
			}
			
			messageText = "Signups: " + dateOfAttendance + ". " + warType + " on " + dayText + ". " 
				+ thisConfig.attendanceGroup + ", make sure you sign up for attendance!\n\n Remember, the robot's are watching\n"
				+ "\n React with " + thisConfig.attending + " if you're attending."
				+ "\n React with " + thisConfig.notAttending + " if you're afk."
				+ "\n React with " + thisConfig.late + " if you're going to be late." 
			
			// React to it's own post with the appropriate icons
			receivedMessage.channel.send(messageText).then( function(message){ 
			
				// Check each stored emoji to see if it's custom or unicode.
				sleep(500).then(() => { 
				
					// If it's a custom emoji, not unicode
					if (thisConfig.attending.split(":").length == 3){ 
					
						message.react(receivedMessage.guild.emojis.find(emoji => emoji.name === thisConfig.attending.split(":")[1]));
					}
					
					else { message.react(thisConfig.attending);  }
				
				});
				
				sleep(1000).then(() => { 
					
					// If it's a custom emoji, not unicode
					if (thisConfig.notAttending.split(":").length == 3){ 
					
						message.react(receivedMessage.guild.emojis.find(emoji => emoji.name === thisConfig.notAttending.split(":")[1]));
					}
					
					else { message.react(thisConfig.notAttending);  }
				});
				
				sleep(1500).then(() => { 
					
					// If it's a custom emoji, not unicode
					if (thisConfig.late.split(":").length == 3){ 
					
						message.react(receivedMessage.guild.emojis.find(emoji => emoji.name === thisConfig.late.split(":")[1]));
					}
					
					else { message.react(thisConfig.late);  }
				});
			
			}).catch(function() { });
		}
		
		// If there's already an entry for that date, chastise them for trying to break me
		else {
			
			receivedMessage.channel.send("There is already a post for attendance on that date. Shit gets confusing if there's two, "
				+"so I don't allow it. You might have to un-delete an old entry, or you're stupid and typed in the wrong date.");
		}
	}
	
	// If invalid, insult them and tell them they suck
	else {
		
		receivedMessage.channel.send("Enter a valid date, jerk. Like 12/13/2020. It's MM/DD/YYYY format because America." 
			+ " Also, hurry and delete this and your embarassing message before someone sees it.");

	}
}

// Gets the attendance for a specific date
function getAttendance (arguments, receivedMessage, thisConfig){

	// Default Vars
	var dateRequested = arguments[0].split('.')[0];
	var formattedDate = new Date(dateRequested);
	var messageTxt = "No signups found on that date.";
	
	// Try to parse a valid date
	if (formattedDate instanceof Date && !isNaN(formattedDate) && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateRequested)){
		
		// Get the appropriate entries for attendance
		var thisAttendance = sql.prepare("SELECT * FROM BotsawAttendance WHERE guild = ? and attendanceDate = ?").all(receivedMessage.guild.id, dateRequested);
		var messageTxt = "";
		
		console.log("Requesting attendance for server: " + receivedMessage.guild.id + " on " + dateRequested);
		
		// If there are no entries, user was probably dumb
		if (thisAttendance.length == 0){
			
			receivedMessage.channel.send("There's no attendance message recorded for that date. Make sure you've made the announcement,"
				+ " or double check the date you have entered.");
		}
		
		else {
			
			var embed = new Discord.RichEmbed()
				.setColor("#0099ff")
				.setTitle("__________ - Attendance for " + dateRequested + " - __________");
			
			var userString = "";
			var statusString = "";
			
			// loop through all records
			for (var row of thisAttendance){
				console.log(row.attendanceStatus);
				// If it's the bot, ignore it
				if (row.attendanceUser != botsawId.slice(2, -1)){
					
					var user = receivedMessage.guild.members.find(m => m.id == row.attendanceUser).user.username;
					
					userString += user + "\n";
					statusString += row.attendanceStatus + "\n";
				}
			}
			
			embed.addField("User", userString, true);
			embed.addField("Status", statusString, true);
			
			receivedMessage.channel.send(embed);
		}
	}
	
	// If invalid, insult them and tell them they suck
	else {
		
		receivedMessage.channel.send("Enter a valid date, jerk. Like 12/13/2020. It's MM/DD/YYYY format because America." 
			+ " Also, hurry and delete this and your embarassing message before someone sees it.");

	}
}

// Sets the config for a specific group
function setAttendanceGroup (arguments, receivedMessage, thisConfig){
	
	var isBadChannel = false;
	if (typeof arguments[0] == "undefined"){isBadChannel = true; }
	else if (arguments[0].length < 2){isBadChannel = true;}
	else if (receivedMessage.guild.channels.exists('name', arguments[0])){ isBadChannel = true;}
	
	if (isBadChannel){ receivedMessage.channel.send("That's not a valid role."); }
	
	else {
		
		thisConfig.attendanceGroup = arguments[0];
		client.setConfig.run(thisConfig);
		console.log("Config attendanceChannel updated to: " + thisConfig.attendanceGroup);
		receivedMessage.channel.send("Role for tracking attendance changed to " + arguments[0] + ".");
	}
}

// Sets the config for a specific group
function setAttending (arguments, receivedMessage, thisConfig){
	
	var isBadEmoji = false;
	if (typeof arguments[0] == "undefined"){isBadEmoji = true; }
	//else if (receivedMessage.guild.channels.exists('name', arguments[0])){ isBadEmoji = true;}
	
	if (isBadEmoji){ receivedMessage.channel.send("That's not a valid emoji."); }
	
	else {
		
		thisConfig.attending = arguments[0];
		client.setConfig.run(thisConfig);
		console.log("Config attendanceChannel updated to: " + arguments[0]);
		receivedMessage.channel.send("Emoji indicating attendance changed to " + thisConfig.attending + ".");
	}
}

// Sets the config for a specific group
function setNotAttending (arguments, receivedMessage, thisConfig){
	
	var isBadEmoji = false;
	if (typeof arguments[0] == "undefined"){isBadEmoji = true; }
	//else if (receivedMessage.guild.channels.exists('name', arguments[0])){ isBadEmoji = true;}
	
	if (isBadEmoji){ receivedMessage.channel.send("That's not a valid emoji."); }
	
	else {
		
		thisConfig.notAttending = arguments[0];
		client.setConfig.run(thisConfig);
		console.log("Config attendanceChannel updated to: " + arguments[0]);
		receivedMessage.channel.send("Emoji indicating not attending changed to " + thisConfig.notAttending + ".");
	}
}

// Sets the config for a specific group
function setLate (arguments, receivedMessage, thisConfig){
	
	var isBadEmoji = false;
	if (typeof arguments[0] == "undefined"){isBadEmoji = true; }
	//else if (receivedMessage.guild.channels.exists('name', arguments[0])){ isBadEmoji = true;}
	
	if (isBadEmoji){ receivedMessage.channel.send("That's not a valid emoji."); }
	
	else {
		
		thisConfig.late = arguments[0];
		client.setConfig.run(thisConfig);
		console.log("Config attendanceChannel updated to: " + arguments[0]);
		receivedMessage.channel.send("Emoji indicating late changed to " + thisConfig.late + ".");
	}
}

// Sets up an admin user
function setAdmin (arguments, receivedMessage, thisConfig){
	
	var adminToBe = arguments[0];
	var userId = "";
	
	if (arguments[0].split('!').length > 1){
		
		userId = arguments[0].split('!')[1].slice(0, -1);
	}
	
	// Check if it's a valid user
	let thisGuild = client.guilds.get(thisConfig.guild);
	if (typeof arguments[0] == "undefined"){messageTxt = "That user doesn't exist.";}
	else if (arguments[0].length < 2){messageTxt = "That user doesn't exist.";}
	else if (userId == ""){messageTxt = "That user doesn't exist.";}
	else if (thisGuild.member(arguments[0].split('!')[1].slice(0, -1)) == null){ messageTxt = "That user doesn't exist."; }
	
	else {
		
		var admin = sql.prepare("SELECT * FROM BotsawAdmins WHERE user = ? AND guild = ?").all(userId, thisGuild.id);;
		
		// If they've never been slapped, create an entry for them
		if (admin.length == 0){
			
			console.log("Admin to add");
			
			// create their slap entry
			admin = {
				
				id: userId + "-" + receivedMessage.guild.id,
				user: userId,
				guild: thisGuild.id
			}
			
			client.setAdmin.run(admin);
			receivedMessage.channel.send(arguments[0] + " added as an admin.");
		}
		
		// Otherwise, increment the counter and save it
		else {
			
			console.log("Admin Exists");
			receivedMessage.channel.send("That guy is already an admin");
		}
	}
}

// Function for ensuring proper waiting for async events
function sleep(ms) {
	
  return new Promise(resolve => setTimeout(resolve, ms));
}

bot_secret_token = "Njc3ODQzODk0NTE5NzI2MDkw.XkaKHA.uJS5yleeoWq98HFBbyqwtO-Gmsk"

client.login(bot_secret_token)

































