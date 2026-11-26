// V12.11: quality budgets only; material appearance remains in smokePreset.
export const performancePreset = Object.freeze({
  interactionEdge: 560, minInteractionEdge: 340, maxInteractionEdge: 840,
  interactionSteps: 16, minInteractionSteps: 12, maxInteractionSteps: 24,
  previewEdge: 480, previewSteps: 12,
  staticEdge: 1100, highEdge: 1500, staticSamples: 12,
  targetMs: 38, interactionIntervalMs: 16, settleMs: 180,
  readingSettleMs: 480, idleFrameIntervalMs: 16,
  earlyExit: 0.001, adaptive: false, stableEdge: 960, stableHighEdge: 1500, stableFastEdge: 840
});
export function createQualityBudget(config=performancePreset){
 let edge=config.interactionEdge,steps=config.interactionSteps,ema=null,observations=0;
 return {observe(ms){if(!Number.isFinite(ms)||ms<=0||ms>5000)return;ema=ema===null?ms:ema*.75+ms*.25;if(++observations%3||!config.adaptive)return;
  if(ema>config.targetMs*1.18){edge=Math.max(config.minInteractionEdge,Math.round(edge*.86/20)*20);steps=Math.max(config.minInteractionSteps,steps-2);}
  else if(ema<config.targetMs*.68){edge=Math.min(config.maxInteractionEdge,Math.round(edge*1.10/20)*20);steps=Math.min(config.maxInteractionSteps,steps+2);}
 },state(){return {edge,steps,ms:ema===null?null:Math.round(ema*10)/10};}};
}
