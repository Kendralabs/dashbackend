export const mapUser = (obj) => {
    const retrunObj = {
        id : obj.id,
        username : obj.username,
        email : obj.email,
        password : obj.password,
        isAdmin : obj.is_admin
    }
    return retrunObj;
}