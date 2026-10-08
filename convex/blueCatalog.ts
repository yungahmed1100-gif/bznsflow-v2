import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { executeCatalog } from './blueCatalogState.js';

const price=v.object({type:v.string(),currency:v.string(),amount:v.optional(v.number()),minimum:v.optional(v.number()),maximum:v.optional(v.number()),unit:v.string(),label:v.string()});
export const entry=v.object({entryKey:v.string(),kind:v.string(),nameEn:v.string(),nameAr:v.string(),category:v.string(),benefitEn:v.string(),benefitAr:v.string(),descriptionEn:v.string(),descriptionAr:v.string(),availability:v.string(),prices:v.array(price),source:v.string(),confidence:v.number(),laylaUseEn:v.string(),laylaUseAr:v.string(),sortOrder:v.number()});
export const execute=internalMutation({args:{operation:v.union(...['list','match','save','saveMany','archive','approve','discard','publish','summary'].map(x=>v.literal(x))),ownerKey:v.string(),cursor:v.optional(v.number()),limit:v.optional(v.number()),all:v.optional(v.boolean()),entry:v.optional(entry),entries:v.optional(v.array(entry)),entryKey:v.optional(v.string()),query:v.optional(v.string())},
  handler:(ctx,args)=>executeCatalog(ctx,args)});
