const meow = require("meow");
const fs = require("fs");
const pm2 = require("pm2");
const assert  = require("assert");
const path = require("path");

const cli = meow(`
    Usage:
        jgnet <start|stop|init|list|ls> <args>

        jgnet init
        jgnet list
        jgnet start netconfig.js
        jgnet stop netconfig.js
`);


let template = `
module.exports = {
    "netname":"MyNetA",
    "routes":[
//      ["MyNetB","intf2"]
    ],
    "interfaces":[
        {
            "name":"intf1",
            "entry":"example.com",
        },
        {
            "name":"intf2",
            "entry":"127.0.0.1",
//          "to_registry":"jigsaw://example.com/",
//          "to_netname":"MyNetB",
//          "to_interface":"intf1"
        }
    ],
    "enable_registry":true
}
`;

switch(cli.input[0]){
    case "start":{
        assert(cli.input[1]);
        let config_path = path.resolve(cli.input[1]);
        let config = require(config_path);
        assert(config.netname);

        pm2.connect((err)=>{
            if(err){
                console.log("notice that pm2 should be at running to execute this command")
                process.exit(2);
            };

            pm2.start({
                script:path.join(__dirname,"start-from-config.js"),
                namespace:"jigsaw-net",
                name:config.netname,
                args:[config_path]
        },(err,apps)=>{
                if(err){
                    console.log(err);
                    process.exit(2);
                }
                pm2.dump(()=>{
                    if(err){
                        console.log(err);
                        process.exit(2);
                    }    
                    pm2.disconnect();
                    process.exit(0);
                })
            })
        })
        
        break;
    }
    case "stop":{
        assert(cli.input[1]);
        pm2.connect((err)=>{
            if(err){
                console.log("notice that pm2 should be at running to execute this command")
                process.exit(2);
            };
            pm2.delete(cli.input[1],(err)=>{
                if(err){
                    console.log(err);
                    process.exit(2);
                }
                pm2.list((err,list)=>{
                    if(list.length == 0)
                        process.exit(0);
                    
                    pm2.dump((err)=>{
                        if(err){
                            console.log(err);
                            process.exit(2);
                        }
                    })
    
                })
            })
        });
        break;
    }
    case "reload":{
        assert(cli.input[1])
        pm2.reload(cli.input[1],(err)=>{
            if(err){
                console.log(err);
                process.exit(2);
            }
            process.exit(0);
        })

        break;
    }
    case "list":
    case "ls":{
        pm2.list((err,list)=>{
            if(err){
                console.log(err);
                process.exit(2);
            }
            for(proc of list){
                if(proc.pm2_env.namespace == "jigsaw-net"){
                    console.log(proc.name);
                }

            }
            process.exit(0);
        });
        break;
    }
    case "init":{
        fs.writeFileSync("./netconfig.js",template);
        break;
    }
    default:
        cli.showHelp()

}
