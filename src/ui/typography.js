import {e} from './atoms.js';

const render=(value,variant,tag,className='')=>`<${tag} class="ui-text ui-text--${variant}${className?' '+e(className):''}">${e(value)}</${tag}>`;
export const text=(value,{className=''}={})=>render(value,'body','p',className);
export const description=(value,{className=''}={})=>render(value,'description','p',className);
export const caption=(value,{className='',inline=false}={})=>render(value,'caption',inline?'span':'small',className);
