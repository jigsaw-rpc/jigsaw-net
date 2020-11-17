type Config = {
    netname:string,
    routes:Array<Array<string>>, /* [ [RouteRule , NetInterface Name] ] */
    link_routes:Array<Array<string>>
};

export default Config;