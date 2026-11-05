import { api } from "./api";
import { notifyPropertyBrandChanged } from "./property-api";
export type PlatformProperty = {
  property_id:string;hotel_name:string;city:string;country_code:string;status:"active"|"inactive";version:number;
  created_at:string;archived_at:string|null;archive_reason:string;member_count:number;
  owner:{id:string;name:string;email:string;approved_limit:number}|null;
};
export type PlatformPropertyList={properties:PlatformProperty[];total:number;page:number;limit:number;has_more:boolean};
export async function getPlatformProperties(params:{page:number;status:string;search:string}){return(await api.get<PlatformPropertyList>("/platform/properties",{params:{...params,limit:25}})).data;}
export async function changePlatformProperty(propertyId:string,action:"rename"|"archive"|"restore",input:{version:number;reason:string;hotel_name?:string;confirm_name?:string}){
  const result=(await api.post<{message:string;property:PlatformProperty}>(`/platform/properties/${encodeURIComponent(propertyId)}/${action}`,input)).data;
  if(action==="rename")notifyPropertyBrandChanged(propertyId);
  return result;
}
