export const getFormKeys = (e) =>{
    const form  = e.currentTarget; 
    const formData = new FormData(form)
    const data = Object.fromEntries(formData.entries());
    console.log(data)
    return data;

}