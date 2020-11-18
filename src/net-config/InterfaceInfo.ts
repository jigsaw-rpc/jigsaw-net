class InterfaceInfo{
    private left_life : number;
    private intf_name :string = "";
    private from_domain : string="";

    constructor(intf_name:string){
        this.intf_name = intf_name;
        this.left_life = 10;

    }
    isExpired(){
        return this.left_life <= 0;
    }
    countdown(){
        this.left_life -- ;
    }
    updateInfo(from_domain:string){
        this.from_domain = from_domain;

        this.left_life = 10;
    }
    getInfo(){
        return {intf_name:this.intf_name,from_domain:this.from_domain};
    }

}

export default InterfaceInfo;
