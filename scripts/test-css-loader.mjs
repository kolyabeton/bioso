export async function load(url,context,nextLoad){
 if(url.endsWith('.css'))return{format:'module',shortCircuit:true,source:'export default undefined;'};
 return nextLoad(url,context);
}
