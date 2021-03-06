import assert from "assert";
import matcher from "matcher";

class RouteParser{
    private route_rule : Array<string>;
    private domain : string;
    constructor(domain:string,route_rule : Array<string>){
        assert.strictEqual(route_rule.length,2);
        this.domain = domain;
        this.route_rule = route_rule;
    }
    isMatched(){
//        return this.route_rule[0] == this.domain;
        return matcher.isMatch(this.domain,this.route_rule[0],{caseSensitive:true});
    }
    getRegpath(){
        assert(this.isMatched());
        return this.route_rule[1];
    }

}

export default RouteParser;
