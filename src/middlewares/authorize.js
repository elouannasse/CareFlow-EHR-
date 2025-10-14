export function authorize(roles = []) {
    return(req,res,next)=>{
        if(!req.user){
            return res.status(401).json({"message":"Non connecté"});
        }
        if(!roles.includes(req.user.role)){
            return res.status(403).json({"message":"Non autorisé"});
        }
        next();
    };
}