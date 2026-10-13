import{$ as Lr,$n as lU,$t as Xw,An as eI,Ar as sI,B as Ig,C as Fr,Ct as SH,Dn as dI,Dr as ri$1,En as cy,Fr as sy,Gr as vd,H as J,Hn as ie,Hr as uy,In as g,Jn as js,Kn as jj,Kr as vh,Ln as gE,Lr as tf,M as H,Mn as eu,Mt as Tg,Nr as sn$1,O as Ge,Or as ru,Ot as Sn,P as HI,Pn as fe,Pt as Tr,Qr as xg,R as I,Rn as gI,Rr as tg,Rt as Ug,Ut as Vn$1,V as It,Vn as hI,Vr as uu,W as Jw,Wr as vU,X as Kw,Y as Km,Z as Ky,Zn as kg,Zr as ws,_ as CH,_n as ae,_r as oi$1,ar as mn$1,b as Ds,bt as Ru,cr as mu,ct as Ou,dr as nf,dt as Pr,ei as yd,er as lo,et as M,fn as Zw,gr as oe,h as Bt,hr as oC,it as Ng,jt as TT,k as Gg,kn as du,kr as sH,kt as Sr,lt as PI,m as Bj,mr as nu,nr as lu,o as $r,ot as Og,pt as Q$1,qt as Wg,rr as ma,rt as Mg,s as Ag,sn as ZI,st as Os,t as $,ur as ne,vn as ag,vr as ot,w as Fs,wn as cm,x as EH,xn as bg,y as Dg,yn as au,yr as pE,yt as Rg,zr as ti$1,zt as Uj}from"./chunk-Cb963is8.js";import"./main-W7GVWOFF.js";import{C as ud,E as yo,S as rn$1,T as wc,_ as hd,a as Ps,b as pd,c as Ti,d as Vs,f as Zr,g as gr,h as bd,i as Ni,l as Ui,m as ac,n as Ii,o as Ra,p as Zt,r as Mi,s as St,t as G,u as Vr,v as ic,w as ui,x as rc,y as nc}from"./chunk-uNdZC-oV.js";var tn=Symbol(`FIELD_TREE`);function ge(n){return typeof n==`function`&&n[tn]===!0}var rn=new I(``);var ft=class{_box;_destroyed=new $;_resizeSubject=new $;_resizeObserver;_elementObservables=new Map;constructor(o){this._box=o,typeof ResizeObserver<`u`&&(this._resizeObserver=new ResizeObserver(e=>this._resizeSubject.next(e)))}observe(o){return this._elementObservables.has(o)||this._elementObservables.set(o,new M(e=>{let t=this._resizeSubject.subscribe(e);return this._resizeObserver?.observe(o,{box:this._box}),()=>{this._resizeObserver?.unobserve(o),t.unsubscribe(),this._elementObservables.delete(o)}}).pipe(It(e=>e.some(t=>t.target===o)),vd({bufferSize:1,refCount:!0}),Pr(this._destroyed))),this._elementObservables.get(o)}destroy(){this._destroyed.next(),this._destroyed.complete(),this._resizeSubject.complete(),this._elementObservables.clear()}};var on=(()=>{class n{_cleanupErrorListener;_observers=new Map;_ngZone=g(ae);constructor(){}ngOnDestroy(){for(let[,e]of this._observers)e.destroy();this._observers.clear(),this._cleanupErrorListener?.()}observe(e,t){let i=t?.box||`content-box`;return this._observers.has(i)||this._observers.set(i,new ft(i)),this._observers.get(i).observe(e)}static ɵfac=function(t){return new(t||n)};static ɵprov=ie({token:n,factory:n.ɵfac})}return n})();var Z=(()=>{class n{static ɵfac=function(t){return new(t||n)};static ɵdir=Sr({type:n,selectors:[[`mat-label`]]})}return n})();var Tn=new I(`MatError`);var Q=(()=>{class n{align=`start`;id=g(uy).getId(`mat-mdc-hint-`);static ɵfac=function(t){return new(t||n)};static ɵdir=Sr({type:n,selectors:[[`mat-hint`]],hostAttrs:[1,`mat-mdc-form-field-hint`,`mat-mdc-form-field-bottom-align`],hostVars:4,hostBindings:function(t,i){t&2&&(Ig(`id`,i.id),eu(`align`,null),lu(`mat-mdc-form-field-hint-end`,i.align===`end`))},inputs:{align:`align`,id:`id`}})}return n})();var kn=new I(`MatPrefix`);var In=new I(`MatSuffix`);var fn=new I(`FloatingLabelParent`);var an=(()=>{class n{_elementRef=g(Ge);get floating(){return this._floating}set floating(e){this._floating=e,this.monitorResize&&this._handleResize()}_floating=!1;get monitorResize(){return this._monitorResize}set monitorResize(e){this._monitorResize=e,this._monitorResize?this._subscribeToResize():this._resizeSubscription.unsubscribe()}_monitorResize=!1;_resizeObserver=g(on);_ngZone=g(ae);_parent=g(fn);_resizeSubscription=new J;ngOnDestroy(){this._resizeSubscription.unsubscribe()}getWidth(){return Rn(this._elementRef.nativeElement)}get element(){return this._elementRef.nativeElement}_handleResize(){setTimeout(()=>this._parent._handleLabelResized())}_subscribeToResize(){this._resizeSubscription.unsubscribe(),this._ngZone.runOutsideAngular(()=>{this._resizeSubscription=this._resizeObserver.observe(this._elementRef.nativeElement,{box:`border-box`}).subscribe(()=>this._handleResize())})}static ɵfac=function(t){return new(t||n)};static ɵdir=Sr({type:n,selectors:[[`label`,`matFormFieldFloatingLabel`,``]],hostAttrs:[1,`mdc-floating-label`,`mat-mdc-floating-label`],hostVars:2,hostBindings:function(t,i){t&2&&lu(`mdc-floating-label--float-above`,i.floating)},inputs:{floating:`floating`,monitorResize:`monitorResize`}})}return n})();function Rn(n){let o=n;if(o.offsetParent!==null)return o.scrollWidth;let e=o.cloneNode(!0);e.style.setProperty(`position`,`absolute`),e.style.setProperty(`transform`,`translate(-9999px, -9999px)`),document.documentElement.appendChild(e);let t=e.scrollWidth;return e.remove(),t}var ln=`mdc-line-ripple--active`;var je=`mdc-line-ripple--deactivating`;var dn=(()=>{class n{_elementRef=g(Ge);_cleanupTransitionEnd;constructor(){let e=g(ae),t=g(Sn);e.runOutsideAngular(()=>{this._cleanupTransitionEnd=t.listen(this._elementRef.nativeElement,`transitionend`,this._handleTransitionEnd)})}activate(){let e=this._elementRef.nativeElement.classList;e.remove(je),e.add(ln)}deactivate(){this._elementRef.nativeElement.classList.add(je)}_handleTransitionEnd=e=>{let t=this._elementRef.nativeElement.classList,i=t.contains(je);e.propertyName===`opacity`&&i&&t.remove(ln,je)};ngOnDestroy(){this._cleanupTransitionEnd()}static ɵfac=function(t){return new(t||n)};static ɵdir=Sr({type:n,selectors:[[`div`,`matFormFieldLineRipple`,``]],hostAttrs:[1,`mdc-line-ripple`]})}return n})();var sn=(()=>{class n{_elementRef=g(Ge);_ngZone=g(ae);open=!1;_notch;ngAfterViewInit(){let e=this._elementRef.nativeElement,t=e.querySelector(`.mdc-floating-label`);t?(e.classList.add(`mdc-notched-outline--upgraded`),typeof requestAnimationFrame==`function`&&(t.style.transitionDuration=`0s`,this._ngZone.runOutsideAngular(()=>{requestAnimationFrame(()=>t.style.transitionDuration=``)}))):e.classList.add(`mdc-notched-outline--no-label`)}_setNotchWidth(e){let t=this._notch.nativeElement;!this.open||!e?t.style.width=``:t.style.width=`calc(${e}px * var(--mat-mdc-form-field-floating-label-scale, 0.75) + 9px)`}_setMaxWidth(e){this._notch.nativeElement.style.setProperty(`--mat-form-field-notch-max-width`,`calc(100% - ${e}px)`)}static ɵfac=function(t){return new(t||n)};static ɵcmp=(function(){let e=[`notch`];return tg({type:n,selectors:[[`div`,`matFormFieldNotchedOutline`,``]],viewQuery:function(l,b){if(l&1&&au(e,5),l&2){let _;xg(_=kg())&&(b._notch=_.first)}},hostAttrs:[1,`mdc-notched-outline`],hostVars:2,hostBindings:function(l,b){l&2&&lu(`mdc-notched-outline--notched`,b.open)},inputs:{open:[0,`matFormFieldNotchedOutlineOpen`,`open`]},ngContentSelectors:[`*`],decls:5,vars:0,consts:[[`notch`,``],[1,`mat-mdc-notch-piece`,`mdc-notched-outline__leading`],[1,`mat-mdc-notch-piece`,`mdc-notched-outline__notch`],[1,`mat-mdc-notch-piece`,`mdc-notched-outline__trailing`]],template:function(l,b){l&1&&(Mg(),ru(0,`div`,1),Os(1,`div`,2,0),Ng(3),Fs(),ru(4,`div`,3))},encapsulation:2})})()}return n})();var ut=(()=>{class n{id;ngField=null;ngControl=null;focused=!1;empty=!1;shouldLabelFloat=!1;required=!1;disabled=!1;errorState=!1;controlType;autofilled;userAriaDescribedBy;disableAutomaticLabeling;describedByIds;stateChanges=null;value;static ɵfac=function(t){return new(t||n)};static ɵdir=Sr({type:n})}return n})();var ht=new I(`MatFormField`);var Pn=new I(`MAT_FORM_FIELD_DEFAULT_OPTIONS`);var cn=`fill`;var An=`auto`;var mn=`fixed`;var On=`translateY(-50%)`;var se=(()=>{class n{_elementRef=g(Ge);_changeDetectorRef=g(mu);_platform=g(Ru);_idGenerator=g(uy);_ngZone=g(ae);_defaults=g(Pn,{optional:!0});_currentDirection;_unwrapMaybeSignal(e){return lo(e)?e():e}_textField;_iconPrefixContainer;_textPrefixContainer;_iconSuffixContainer;_textSuffixContainer;_floatingLabel;_notchedOutline;_lineRipple;_iconPrefixContainerSignal=jj(`iconPrefixContainer`);_textPrefixContainerSignal=jj(`textPrefixContainer`);_iconSuffixContainerSignal=jj(`iconSuffixContainer`);_textSuffixContainerSignal=jj(`textSuffixContainer`);_prefixSuffixContainers=js(()=>[this._iconPrefixContainerSignal(),this._textPrefixContainerSignal(),this._iconSuffixContainerSignal(),this._textSuffixContainerSignal()].map(e=>e?.nativeElement).filter(e=>e!==void 0));_formFieldControl;_prefixChildren;_suffixChildren;_errorChildren;_hintChildren;_labelChild=Bj(Z);get hideRequiredMarker(){return this._hideRequiredMarker}set hideRequiredMarker(e){this._hideRequiredMarker=Zr(e)}_hideRequiredMarker=!1;color=`primary`;get floatLabel(){return this._floatLabel||this._defaults?.floatLabel||An}set floatLabel(e){e!==this._floatLabel&&(this._floatLabel=e,this._changeDetectorRef.markForCheck())}_floatLabel;get appearance(){return this._appearanceSignal()}set appearance(e){let t=e||this._defaults?.appearance||cn;this._appearanceSignal.set(t)}_appearanceSignal=fe(cn);get subscriptSizing(){return this._subscriptSizing||this._defaults?.subscriptSizing||mn}set subscriptSizing(e){this._subscriptSizing=e||this._defaults?.subscriptSizing||mn}_subscriptSizing=null;get hintLabel(){return this._hintLabel}set hintLabel(e){this._hintLabel=e,this._processHints()}_hintLabel=``;_hasIconPrefix=!1;_hasTextPrefix=!1;_hasIconSuffix=!1;_hasTextSuffix=!1;_labelId=this._idGenerator.getId(`mat-mdc-form-field-label-`);_hintLabelId=this._idGenerator.getId(`mat-mdc-hint-`);_describedByIds;get _control(){return this._explicitFormFieldControl||this._formFieldControl}set _control(e){this._explicitFormFieldControl=e}_destroyed=new $;_isFocused=null;_explicitFormFieldControl;_previousControl=null;_previousControlValidatorFn=null;_stateChanges;_valueChanges;_describedByChanges;_outlineLabelOffsetResizeObserver=null;_animationsDisabled=G();constructor(){let e=this._defaults,t=g(Ou);e&&(e.appearance&&(this.appearance=e.appearance),this._hideRequiredMarker=!!e?.hideRequiredMarker,e.color&&(this.color=e.color)),mn$1(()=>this._currentDirection=t.valueSignal()),this._syncOutlineLabelOffset()}ngAfterViewInit(){this._updateFocusState(),this._animationsDisabled||this._ngZone.runOutsideAngular(()=>{setTimeout(()=>{this._elementRef.nativeElement.classList.add(`mat-form-field-animations-enabled`)},300)}),this._changeDetectorRef.detectChanges()}ngAfterContentInit(){this._assertFormFieldControl(),this._initializeSubscript(),this._initializePrefixAndSuffix()}ngAfterContentChecked(){this._assertFormFieldControl(),this._control!==this._previousControl&&(this._initializeControl(this._previousControl),this._control.ngControl&&this._control.ngControl.control&&(this._previousControlValidatorFn=ge(this._control.ngField)?null:this._control.ngControl.control.validator),this._previousControl=this._control,this._changeDetectorRef.markForCheck()),this._control.ngControl&&this._control.ngControl.control&&!ge(this._control.ngField)&&this._control.ngControl.control.validator!==this._previousControlValidatorFn&&this._changeDetectorRef.markForCheck()}ngOnDestroy(){this._outlineLabelOffsetResizeObserver?.disconnect(),this._stateChanges?.unsubscribe(),this._valueChanges?.unsubscribe(),this._describedByChanges?.unsubscribe(),this._destroyed.next(),this._destroyed.complete()}getLabelId=js(()=>this._hasFloatingLabel()?this._labelId:null);getConnectedOverlayOrigin(){return this._textField||this._elementRef}_animateAndLockLabel(){this._hasFloatingLabel()&&(this.floatLabel=`always`)}_initializeControl(e){let t=this._control,i=`mat-mdc-form-field-type-`;e&&this._elementRef.nativeElement.classList.remove(i+e.controlType),t.controlType&&this._elementRef.nativeElement.classList.add(i+t.controlType),this._stateChanges?.unsubscribe(),this._stateChanges=t.stateChanges?.subscribe(()=>{this._updateFocusState(),this._changeDetectorRef.markForCheck()}),this._describedByChanges?.unsubscribe(),this._describedByChanges=t.stateChanges?.pipe($r([void 0,void 0]),ne(()=>[this._unwrapMaybeSignal(t.errorState),t.userAriaDescribedBy]),yd(),It(([[l,b],[_,P]])=>l!==_||b!==P)).subscribe(()=>this._syncDescribedByIds()),this._valueChanges?.unsubscribe(),t.ngControl&&t.ngControl.valueChanges&&!ge(t.ngField)&&(this._valueChanges=t.ngControl.valueChanges.pipe(Pr(this._destroyed)).subscribe(()=>this._changeDetectorRef.markForCheck()))}_checkPrefixAndSuffixTypes(){this._hasIconPrefix=!!this._prefixChildren.find(e=>!e._isText),this._hasTextPrefix=!!this._prefixChildren.find(e=>e._isText),this._hasIconSuffix=!!this._suffixChildren.find(e=>!e._isText),this._hasTextSuffix=!!this._suffixChildren.find(e=>e._isText)}_initializePrefixAndSuffix(){this._checkPrefixAndSuffixTypes(),Ky(this._prefixChildren.changes,this._suffixChildren.changes).subscribe(()=>{this._checkPrefixAndSuffixTypes(),this._changeDetectorRef.markForCheck()})}_initializeSubscript(){this._hintChildren.changes.subscribe(()=>{this._processHints(),this._changeDetectorRef.markForCheck()}),this._errorChildren.changes.subscribe(()=>{this._syncDescribedByIds(),this._changeDetectorRef.markForCheck()}),this._validateHints(),this._syncDescribedByIds()}_assertFormFieldControl(){this._control}_updateFocusState(){let e=this._unwrapMaybeSignal(this._control.focused);e&&!this._isFocused?(this._isFocused=!0,this._lineRipple?.activate()):!e&&(this._isFocused||this._isFocused===null)&&(this._isFocused=!1,this._lineRipple?.deactivate()),this._elementRef.nativeElement.classList.toggle(`mat-focused`,e),this._textField?.nativeElement.classList.toggle(`mdc-text-field--focused`,e)}_syncOutlineLabelOffset(){Uj({earlyRead:()=>{if(this._appearanceSignal()!==`outline`)return this._outlineLabelOffsetResizeObserver?.disconnect(),null;if(globalThis.ResizeObserver){this._outlineLabelOffsetResizeObserver||=new globalThis.ResizeObserver(()=>{this._writeOutlinedLabelStyles(this._getOutlinedLabelOffset())});for(let e of this._prefixSuffixContainers())this._outlineLabelOffsetResizeObserver.observe(e,{box:`border-box`})}return this._getOutlinedLabelOffset()},write:e=>this._writeOutlinedLabelStyles(e())})}_shouldAlwaysFloat(){return this.floatLabel===`always`}_hasOutline(){return this.appearance===`outline`}_forceDisplayInfixLabel(){return!this._platform.isBrowser&&this._prefixChildren.length&&!this._shouldLabelFloat()}_hasFloatingLabel=js(()=>!!this._labelChild());_shouldLabelFloat(){return this._hasFloatingLabel()?this._shouldAlwaysFloat()||this._unwrapMaybeSignal(this._control.shouldLabelFloat):!1}_shouldForward(e){let t=this._control?.ngField||this._control?.ngControl;if(!t)return!1;if(ge(t)){let i=t();return e===`valid`?i.valid():e===`dirty`?i.dirty():e===`touched`?i.touched():e===`pending`?i.pending():e===`untouched`?!i.touched():e===`pristine`?!i.dirty():e===`invalid`?!i.valid():!1}else{let i=t;return e===`valid`?i.valid:e===`dirty`?i.dirty:e===`touched`?i.touched:e===`pending`?i.pending:e===`untouched`?i.untouched:e===`pristine`?i.pristine:e===`invalid`?i.invalid:!1}}_getSubscriptMessageType(){return this._errorChildren&&this._errorChildren.length>0&&this._unwrapMaybeSignal(this._control.errorState)?`error`:`hint`}_handleLabelResized(){this._refreshOutlineNotchWidth()}_refreshOutlineNotchWidth(){!this._hasOutline()||!this._floatingLabel||!this._shouldLabelFloat()?this._notchedOutline?._setNotchWidth(0):this._notchedOutline?._setNotchWidth(this._floatingLabel.getWidth())}_processHints(){this._validateHints(),this._syncDescribedByIds()}_validateHints(){this._hintChildren}_syncDescribedByIds(){if(this._control){let e=[];if(this._control.userAriaDescribedBy&&typeof this._control.userAriaDescribedBy==`string`&&e.push(...this._control.userAriaDescribedBy.split(` `)),this._getSubscriptMessageType()===`hint`){let l=this._hintChildren?this._hintChildren.find(_=>_.align===`start`):null,b=this._hintChildren?this._hintChildren.find(_=>_.align===`end`):null;l?e.push(l.id):this._hintLabel&&e.push(this._hintLabelId),b&&e.push(b.id)}else this._errorChildren&&e.push(...this._errorChildren.map(l=>l.id));let t=this._control.describedByIds,i;if(t){let l=this._describedByIds||e;i=e.concat(t.filter(b=>b&&!l.includes(b)))}else i=e;this._control.setDescribedByIds(i),this._describedByIds=e}}_getOutlinedLabelOffset(){if(!this._hasOutline()||!this._floatingLabel)return null;if(!this._iconPrefixContainer&&!this._textPrefixContainer)return[``,null];if(!this._isAttachedToDom())return null;let e=this._iconPrefixContainer?.nativeElement,t=this._textPrefixContainer?.nativeElement,i=this._iconSuffixContainer?.nativeElement,l=this._textSuffixContainer?.nativeElement,b=e?.getBoundingClientRect().width??0,_=t?.getBoundingClientRect().width??0,P=i?.getBoundingClientRect().width??0,V=l?.getBoundingClientRect().width??0;return[`var(--mat-mdc-form-field-label-transform, ${On} translateX(${`calc(${this._currentDirection===`rtl`?`-1`:`1`} * (${`${b+_}px`} + var(--mat-mdc-form-field-label-offset-x, 0px)))`}))`,b+_+P+V]}_writeOutlinedLabelStyles(e){if(e!==null){let[t,i]=e;this._floatingLabel&&(this._floatingLabel.element.style.transform=t),i!==null&&this._notchedOutline?._setMaxWidth(i)}}_isAttachedToDom(){let e=this._elementRef.nativeElement;if(e.getRootNode){let t=e.getRootNode();return t&&t!==e}return document.documentElement.contains(e)}static ɵfac=function(t){return new(t||n)};static ɵcmp=(function(){let e=[`iconPrefixContainer`],t=[`textPrefixContainer`],i=[`iconSuffixContainer`],l=[`textSuffixContainer`],b=[`textField`],_=[`*`,[[`mat-label`]],[[``,`matPrefix`,``],[``,`matIconPrefix`,``]],[[``,`matTextPrefix`,``]],[[``,`matTextSuffix`,``]],[[``,`matSuffix`,``],[``,`matIconSuffix`,``]],[[`mat-error`],[``,`matError`,``]],[[`mat-hint`,3,`align`,`end`]],[[`mat-hint`,`align`,`end`]]],P=[`*`,`mat-label`,`[matPrefix], [matIconPrefix]`,`[matTextPrefix]`,`[matTextSuffix]`,`[matSuffix], [matIconSuffix]`,`mat-error, [matError]`,`mat-hint:not([align='end'])`,`mat-hint[align='end']`];function V(m,h){m&1&&bg(0,`span`,21)}function Ge(m,h){if(m&1&&(Ds(0,`label`,20),Ng(1,1),Zw(2,V,1,0,`span`,21),nu()),m&2){let r=dI(2);Dg(`floating`,r._shouldLabelFloat())(`monitorResize`,r._hasOutline())(`id`,r._labelId),eu(`for`,r._control.disableAutomaticLabeling?null:r._control.id),vh(2),Kw(!r.hideRequiredMarker&&r._unwrapMaybeSignal(r._control.required)?2:-1)}}function $e(m,h){if(m&1&&Zw(0,Ge,3,5,`label`,20),m&2){let r=dI();Kw(r._hasFloatingLabel()?0:-1)}}function gt(m,h){m&1&&bg(0,`div`,7)}function Ye(m,h){}function Ze(m,h){if(m&1&&ag(0,Ye,0,0,`ng-template`,13),m&2){dI(2);let r=gI(1);Dg(`ngTemplateOutlet`,r)}}function Qe(m,h){if(m&1&&(Ds(0,`div`,9),Zw(1,Ze,1,1,null,13),nu()),m&2){let r=dI();Dg(`matFormFieldNotchedOutlineOpen`,r._shouldLabelFloat()),vh(),Kw(r._forceDisplayInfixLabel()?-1:1)}}function vn(m,h){m&1&&(Ds(0,`div`,10,2),Ng(2,2),nu())}function _n(m,h){m&1&&(Ds(0,`div`,11,3),Ng(2,3),nu())}function yn(m,h){}function Sn(m,h){if(m&1&&ag(0,yn,0,0,`ng-template`,13),m&2){dI();let r=gI(1);Dg(`ngTemplateOutlet`,r)}}function wn(m,h){m&1&&(Ds(0,`div`,14,4),Ng(2,4),nu())}function Mn(m,h){m&1&&(Ds(0,`div`,15,5),Ng(2,5),nu())}function Cn(m,h){m&1&&bg(0,`div`,16)}function Nn(m,h){m&1&&(Ds(0,`div`,18),Ng(1,6),nu())}function Fn(m,h){if(m&1&&(Ds(0,`mat-hint`,22),PI(1),nu()),m&2){let r=dI(2);Dg(`id`,r._hintLabelId),vh(),Ug(r.hintLabel)}}function En(m,h){if(m&1&&(Ds(0,`div`,19),Zw(1,Fn,2,2,`mat-hint`,22),Ng(2,7),bg(3,`div`,23),Ng(4,8),nu()),m&2){let r=dI();vh(),Kw(r.hintLabel?1:-1)}}return tg({type:n,selectors:[[`mat-form-field`]],contentQueries:function(h,r,p){if(h&1&&(Rg(p,r._labelChild,Z,5),Ag(p,ut,5)(p,kn,5)(p,In,5)(p,Tn,5)(p,Q,5)),h&2){hI();let S;xg(S=kg())&&(r._formFieldControl=S.first),xg(S=kg())&&(r._prefixChildren=S),xg(S=kg())&&(r._suffixChildren=S),xg(S=kg())&&(r._errorChildren=S),xg(S=kg())&&(r._hintChildren=S)}},viewQuery:function(h,r){if(h&1&&(Og(r._iconPrefixContainerSignal,e,5)(r._textPrefixContainerSignal,t,5)(r._iconSuffixContainerSignal,i,5)(r._textSuffixContainerSignal,l,5),au(b,5)(e,5)(t,5)(i,5)(l,5)(an,5)(sn,5)(dn,5)),h&2){hI(4);let p;xg(p=kg())&&(r._textField=p.first),xg(p=kg())&&(r._iconPrefixContainer=p.first),xg(p=kg())&&(r._textPrefixContainer=p.first),xg(p=kg())&&(r._iconSuffixContainer=p.first),xg(p=kg())&&(r._textSuffixContainer=p.first),xg(p=kg())&&(r._floatingLabel=p.first),xg(p=kg())&&(r._notchedOutline=p.first),xg(p=kg())&&(r._lineRipple=p.first)}},hostAttrs:[1,`mat-mdc-form-field`],hostVars:38,hostBindings:function(h,r){h&2&&lu(`mat-mdc-form-field-label-always-float`,r._shouldAlwaysFloat())(`mat-mdc-form-field-has-icon-prefix`,r._hasIconPrefix)(`mat-mdc-form-field-has-icon-suffix`,r._hasIconSuffix)(`mat-form-field-invalid`,r._unwrapMaybeSignal(r._control.errorState))(`mat-form-field-disabled`,r._unwrapMaybeSignal(r._control.disabled))(`mat-form-field-autofilled`,r._unwrapMaybeSignal(r._control.autofilled))(`mat-form-field-appearance-fill`,r.appearance==`fill`)(`mat-form-field-appearance-outline`,r.appearance==`outline`)(`mat-form-field-hide-placeholder`,r._hasFloatingLabel()&&!r._shouldLabelFloat())(`mat-primary`,r.color!==`accent`&&r.color!==`warn`)(`mat-accent`,r.color===`accent`)(`mat-warn`,r.color===`warn`)(`ng-untouched`,r._shouldForward(`untouched`))(`ng-touched`,r._shouldForward(`touched`))(`ng-pristine`,r._shouldForward(`pristine`))(`ng-dirty`,r._shouldForward(`dirty`))(`ng-valid`,r._shouldForward(`valid`))(`ng-invalid`,r._shouldForward(`invalid`))(`ng-pending`,r._shouldForward(`pending`))},inputs:{hideRequiredMarker:`hideRequiredMarker`,color:`color`,floatLabel:`floatLabel`,appearance:`appearance`,subscriptSizing:`subscriptSizing`,hintLabel:`hintLabel`},exportAs:[`matFormField`],features:[du([{provide:ht,useExisting:n},{provide:fn,useExisting:n}])],ngContentSelectors:P,decls:18,vars:21,consts:[[`labelTemplate`,``],[`textField`,``],[`iconPrefixContainer`,``],[`textPrefixContainer`,``],[`textSuffixContainer`,``],[`iconSuffixContainer`,``],[1,`mat-mdc-text-field-wrapper`,`mdc-text-field`,3,`click`],[1,`mat-mdc-form-field-focus-overlay`],[1,`mat-mdc-form-field-flex`],[`matFormFieldNotchedOutline`,``,3,`matFormFieldNotchedOutlineOpen`],[1,`mat-mdc-form-field-icon-prefix`],[1,`mat-mdc-form-field-text-prefix`],[1,`mat-mdc-form-field-infix`],[3,`ngTemplateOutlet`],[1,`mat-mdc-form-field-text-suffix`],[1,`mat-mdc-form-field-icon-suffix`],[`matFormFieldLineRipple`,``],[`aria-atomic`,`true`,`aria-live`,`polite`,1,`mat-mdc-form-field-subscript-wrapper`,`mat-mdc-form-field-bottom-align`],[1,`mat-mdc-form-field-error-wrapper`],[1,`mat-mdc-form-field-hint-wrapper`],[`matFormFieldFloatingLabel`,``,3,`floating`,`monitorResize`,`id`],[`aria-hidden`,`true`,1,`mat-mdc-form-field-required-marker`,`mdc-floating-label--required`],[3,`id`],[1,`mat-mdc-form-field-hint-spacer`]],template:function(h,r){if(h&1&&(Mg(_),ag(0,$e,1,1,`ng-template`,null,0,oC),Ds(2,`div`,6,1),Tg(`click`,function(S){return r._control.onContainerClick(S)}),Zw(4,gt,1,0,`div`,7),Ds(5,`div`,8),Zw(6,Qe,2,2,`div`,9),Zw(7,vn,3,0,`div`,10),Zw(8,_n,3,0,`div`,11),Ds(9,`div`,12),Zw(10,Sn,1,1,null,13),Ng(11),nu(),Zw(12,wn,3,0,`div`,14),Zw(13,Mn,3,0,`div`,15),nu(),Zw(14,Cn,1,0,`div`,16),nu(),Ds(15,`div`,17),Zw(16,Nn,2,0,`div`,18)(17,En,5,1,`div`,19),nu()),h&2){let p,S=r._unwrapMaybeSignal(r._control.disabled);vh(2),lu(`mdc-text-field--filled`,!r._hasOutline())(`mdc-text-field--outlined`,r._hasOutline())(`mdc-text-field--no-label`,!r._hasFloatingLabel())(`mdc-text-field--disabled`,S)(`mdc-text-field--invalid`,r._unwrapMaybeSignal(r._control.errorState)),vh(2),Kw(!r._hasOutline()&&!S?4:-1),vh(2),Kw(r._hasOutline()?6:-1),vh(),Kw(r._hasIconPrefix?7:-1),vh(),Kw(r._hasTextPrefix?8:-1),vh(2),Kw(!r._hasOutline()||r._forceDisplayInfixLabel()?10:-1),vh(2),Kw(r._hasTextSuffix?12:-1),vh(),Kw(r._hasIconSuffix?13:-1),vh(),Kw(r._hasOutline()?-1:14),vh(),lu(`mat-mdc-form-field-subscript-dynamic-size`,r.subscriptSizing===`dynamic`);let Dn=r._getSubscriptMessageType();vh(),Kw((p=Dn)===`error`?16:p===`hint`?17:-1)}},dependencies:[an,sn,TT,dn,Q],styles:[`.mdc-text-field {
  display: inline-flex;
  align-items: baseline;
  padding: 0 16px;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  will-change: opacity, transform, color;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}

.mdc-text-field__input {
  width: 100%;
  min-width: 0;
  border: none;
  border-radius: 0;
  background: none;
  padding: 0;
  -moz-appearance: none;
  -webkit-appearance: none;
  height: 28px;
}
.mdc-text-field__input::-webkit-calendar-picker-indicator, .mdc-text-field__input::-webkit-search-cancel-button {
  display: none;
}
.mdc-text-field__input::-ms-clear {
  display: none;
}
.mdc-text-field__input:focus {
  outline: none;
}
.mdc-text-field__input:invalid {
  box-shadow: none;
}
.mdc-text-field__input::placeholder {
  opacity: 0;
}
.mdc-text-field__input::-moz-placeholder {
  opacity: 0;
}
.mdc-text-field__input::-webkit-input-placeholder {
  opacity: 0;
}
.mdc-text-field__input:-ms-input-placeholder {
  opacity: 0;
}
.mdc-text-field--no-label .mdc-text-field__input::placeholder, .mdc-text-field--focused .mdc-text-field__input::placeholder {
  opacity: 1;
}
.mdc-text-field--no-label .mdc-text-field__input::-moz-placeholder, .mdc-text-field--focused .mdc-text-field__input::-moz-placeholder {
  opacity: 1;
}
.mdc-text-field--no-label .mdc-text-field__input::-webkit-input-placeholder, .mdc-text-field--focused .mdc-text-field__input::-webkit-input-placeholder {
  opacity: 1;
}
.mdc-text-field--no-label .mdc-text-field__input:-ms-input-placeholder, .mdc-text-field--focused .mdc-text-field__input:-ms-input-placeholder {
  opacity: 1;
}
.mdc-text-field--%NS%disabled:not(.mdc-text-field--no-label) .mdc-text-field__input.mat-mdc-input-disabled-interactive::placeholder {
  opacity: 0;
}
.mdc-text-field--%NS%disabled:not(.mdc-text-field--no-label) .mdc-text-field__input.mat-mdc-input-disabled-interactive::-moz-placeholder {
  opacity: 0;
}
.mdc-text-field--%NS%disabled:not(.mdc-text-field--no-label) .mdc-text-field__input.mat-mdc-input-disabled-interactive::-webkit-input-placeholder {
  opacity: 0;
}
.mdc-text-field--%NS%disabled:not(.mdc-text-field--no-label) .mdc-text-field__input.mat-mdc-input-disabled-interactive:-ms-input-placeholder {
  opacity: 0;
}
.mdc-text-field--outlined .mdc-text-field__input, .mdc-text-field--filled.mdc-text-field--no-label .mdc-text-field__input {
  height: 100%;
}
.mdc-text-field--outlined .mdc-text-field__input {
  display: flex;
  border: none !important;
  background-color: transparent;
}
.mdc-text-field--disabled .mdc-text-field__input {
  pointer-events: auto;
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) .mdc-text-field__input {
  color: var(--%NS%mat-form-field-filled-input-text-color, var(--%NS%mat-sys-on-surface));
  caret-color: var(--%NS%mat-form-field-filled-caret-color, var(--%NS%mat-sys-primary));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) .mdc-text-field__input::placeholder {
  color: var(--%NS%mat-form-field-filled-input-text-placeholder-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) .mdc-text-field__input::-moz-placeholder {
  color: var(--%NS%mat-form-field-filled-input-text-placeholder-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) .mdc-text-field__input::-webkit-input-placeholder {
  color: var(--%NS%mat-form-field-filled-input-text-placeholder-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) .mdc-text-field__input:-ms-input-placeholder {
  color: var(--%NS%mat-form-field-filled-input-text-placeholder-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled) .mdc-text-field__input {
  color: var(--%NS%mat-form-field-outlined-input-text-color, var(--%NS%mat-sys-on-surface));
  caret-color: var(--%NS%mat-form-field-outlined-caret-color, var(--%NS%mat-sys-primary));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled) .mdc-text-field__input::placeholder {
  color: var(--%NS%mat-form-field-outlined-input-text-placeholder-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled) .mdc-text-field__input::-moz-placeholder {
  color: var(--%NS%mat-form-field-outlined-input-text-placeholder-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled) .mdc-text-field__input::-webkit-input-placeholder {
  color: var(--%NS%mat-form-field-outlined-input-text-placeholder-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled) .mdc-text-field__input:-ms-input-placeholder {
  color: var(--%NS%mat-form-field-outlined-input-text-placeholder-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--filled.mdc-text-field--%NS%invalid:not(.mdc-text-field--disabled) .mdc-text-field__input {
  caret-color: var(--%NS%mat-form-field-filled-error-caret-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--outlined.mdc-text-field--%NS%invalid:not(.mdc-text-field--disabled) .mdc-text-field__input {
  caret-color: var(--%NS%mat-form-field-outlined-error-caret-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--filled.mdc-text-field--disabled .mdc-text-field__input {
  color: var(--%NS%mat-form-field-filled-disabled-input-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mdc-text-field--outlined.mdc-text-field--disabled .mdc-text-field__input {
  color: var(--%NS%mat-form-field-outlined-disabled-input-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
@media (forced-colors: active) {
  .mdc-text-field--disabled .mdc-text-field__input {
    background-color: Window;
  }
}

.mdc-text-field--filled {
  height: 56px;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
  border-top-left-radius: var(--%NS%mat-form-field-filled-container-shape, var(--%NS%mat-sys-corner-extra-small));
  border-top-right-radius: var(--%NS%mat-form-field-filled-container-shape, var(--%NS%mat-sys-corner-extra-small));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) {
  background-color: var(--%NS%mat-form-field-filled-container-color, var(--%NS%mat-sys-surface-variant));
}
.mdc-text-field--filled.mdc-text-field--disabled {
  background-color: var(--%NS%mat-form-field-filled-disabled-container-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 4%, transparent));
}

.mdc-text-field--outlined {
  height: 56px;
  overflow: visible;
  padding-right: max(16px, var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small)));
  padding-left: max(16px, var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small)) + 4px);
}
[dir=rtl] .mdc-text-field--outlined {
  padding-right: max(16px, var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small)) + 4px);
  padding-left: max(16px, var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small)));
}

.mdc-floating-label {
  position: absolute;
  left: 0;
  transform-origin: left top;
  line-height: 1.15rem;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
  overflow: hidden;
  will-change: transform;
}
[dir=rtl] .mdc-floating-label {
  right: 0;
  left: auto;
  transform-origin: right top;
  text-align: right;
}
.mdc-text-field .mdc-floating-label {
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}
.mdc-notched-outline .mdc-floating-label {
  display: inline-block;
  position: relative;
  max-width: 100%;
}
.mdc-text-field--outlined .mdc-floating-label {
  left: 4px;
  right: auto;
}
[dir=rtl] .mdc-text-field--outlined .mdc-floating-label {
  left: auto;
  right: 4px;
}
.mdc-text-field--filled .mdc-floating-label {
  left: 16px;
  right: auto;
}
[dir=rtl] .mdc-text-field--filled .mdc-floating-label {
  left: auto;
  right: 16px;
}
.mdc-text-field--disabled .mdc-floating-label {
  cursor: default;
}
@media (forced-colors: active) {
  .mdc-text-field--disabled .mdc-floating-label {
    z-index: 1;
  }
}
.mdc-text-field--filled.mdc-text-field--no-label .mdc-floating-label {
  display: none;
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) .mdc-floating-label {
  color: var(--%NS%mat-form-field-filled-label-text-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled).mdc-text-field--focused .mdc-floating-label {
  color: var(--%NS%mat-form-field-filled-focus-label-text-color, var(--%NS%mat-sys-primary));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled):not(.mdc-text-field--focused):hover .mdc-floating-label {
  color: var(--%NS%mat-form-field-filled-hover-label-text-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--filled.mdc-text-field--disabled .mdc-floating-label {
  color: var(--%NS%mat-form-field-filled-disabled-label-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled).mdc-text-field--invalid .mdc-floating-label {
  color: var(--%NS%mat-form-field-filled-error-label-text-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled).mdc-text-field--invalid.mdc-text-field--focused .mdc-floating-label {
  color: var(--%NS%mat-form-field-filled-error-focus-label-text-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled).mdc-text-field--%NS%invalid:not(.mdc-text-field--disabled):hover .mdc-floating-label {
  color: var(--%NS%mat-form-field-filled-error-hover-label-text-color, var(--%NS%mat-sys-on-error-container));
}
.mdc-text-field--filled .mdc-floating-label {
  font-family: var(--%NS%mat-form-field-filled-label-text-font, var(--%NS%mat-sys-body-large-font));
  font-size: var(--%NS%mat-form-field-filled-label-text-size, var(--%NS%mat-sys-body-large-size));
  font-weight: var(--%NS%mat-form-field-filled-label-text-weight, var(--%NS%mat-sys-body-large-weight));
  letter-spacing: var(--%NS%mat-form-field-filled-label-text-tracking, var(--%NS%mat-sys-body-large-tracking));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled) .mdc-floating-label {
  color: var(--%NS%mat-form-field-outlined-label-text-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--focused .mdc-floating-label {
  color: var(--%NS%mat-form-field-outlined-focus-label-text-color, var(--%NS%mat-sys-primary));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled):not(.mdc-text-field--focused):hover .mdc-floating-label {
  color: var(--%NS%mat-form-field-outlined-hover-label-text-color, var(--%NS%mat-sys-on-surface));
}
.mdc-text-field--outlined.mdc-text-field--disabled .mdc-floating-label {
  color: var(--%NS%mat-form-field-outlined-disabled-label-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--invalid .mdc-floating-label {
  color: var(--%NS%mat-form-field-outlined-error-label-text-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--invalid.mdc-text-field--focused .mdc-floating-label {
  color: var(--%NS%mat-form-field-outlined-error-focus-label-text-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--%NS%invalid:not(.mdc-text-field--disabled):hover .mdc-floating-label {
  color: var(--%NS%mat-form-field-outlined-error-hover-label-text-color, var(--%NS%mat-sys-on-error-container));
}
.mdc-text-field--outlined .mdc-floating-label {
  font-family: var(--%NS%mat-form-field-outlined-label-text-font, var(--%NS%mat-sys-body-large-font));
  font-size: var(--%NS%mat-form-field-outlined-label-text-size, var(--%NS%mat-sys-body-large-size));
  font-weight: var(--%NS%mat-form-field-outlined-label-text-weight, var(--%NS%mat-sys-body-large-weight));
  letter-spacing: var(--%NS%mat-form-field-outlined-label-text-tracking, var(--%NS%mat-sys-body-large-tracking));
}

.mdc-floating-label--float-above {
  cursor: auto;
  transform: translateY(-106%) scale(0.75);
}
.mdc-text-field--filled .mdc-floating-label--float-above {
  transform: translateY(-106%) scale(0.75);
}
.mdc-text-field--outlined .mdc-floating-label--float-above {
  transform: translateY(-37.25px) scale(1);
  font-size: 0.75rem;
}
.mdc-notched-outline .mdc-floating-label--float-above {
  text-overflow: clip;
}
.mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  max-width: 133.3333333333%;
}
.mdc-text-field--outlined.mdc-notched-outline--upgraded .mdc-floating-label--float-above, .mdc-text-field--outlined .mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  transform: translateY(-34.75px) scale(0.75);
}
.mdc-text-field--outlined.mdc-notched-outline--upgraded .mdc-floating-label--float-above, .mdc-text-field--outlined .mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  font-size: 1rem;
}

.mdc-floating-label--%NS%required:not(.mdc-floating-label--hide-required-marker)::after {
  margin-left: 1px;
  margin-right: 0;
  content: "*";
}
[dir=rtl] .mdc-floating-label--%NS%required:not(.mdc-floating-label--hide-required-marker)::after {
  margin-left: 0;
  margin-right: 1px;
}

.mdc-notched-outline {
  display: flex;
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  height: 100%;
  text-align: left;
  pointer-events: none;
}
[dir=rtl] .mdc-notched-outline {
  text-align: right;
}
.mdc-text-field--outlined .mdc-notched-outline {
  z-index: 1;
}

.mat-mdc-notch-piece {
  box-sizing: border-box;
  height: 100%;
  pointer-events: none;
  border: none;
  border-top: 1px solid;
  border-bottom: 1px solid;
}
.mdc-text-field--focused .mat-mdc-notch-piece {
  border-width: 2px;
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled) .mat-mdc-notch-piece {
  border-color: var(--%NS%mat-form-field-outlined-outline-color, var(--%NS%mat-sys-outline));
  border-width: var(--%NS%mat-form-field-outlined-outline-width, 1px);
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled):not(.mdc-text-field--focused):hover .mat-mdc-notch-piece {
  border-color: var(--%NS%mat-form-field-outlined-hover-outline-color, var(--%NS%mat-sys-on-surface));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--focused .mat-mdc-notch-piece {
  border-color: var(--%NS%mat-form-field-outlined-focus-outline-color, var(--%NS%mat-sys-primary));
}
.mdc-text-field--outlined.mdc-text-field--disabled .mat-mdc-notch-piece {
  border-color: var(--%NS%mat-form-field-outlined-disabled-outline-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 12%, transparent));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--invalid .mat-mdc-notch-piece {
  border-color: var(--%NS%mat-form-field-outlined-error-outline-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--%NS%invalid:not(.mdc-text-field--focused):hover .mdc-notched-outline .mat-mdc-notch-piece {
  border-color: var(--%NS%mat-form-field-outlined-error-hover-outline-color, var(--%NS%mat-sys-on-error-container));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--invalid.mdc-text-field--focused .mat-mdc-notch-piece {
  border-color: var(--%NS%mat-form-field-outlined-error-focus-outline-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--focused .mdc-notched-outline .mat-mdc-notch-piece {
  border-width: var(--%NS%mat-form-field-outlined-focus-outline-width, 2px);
}

.mdc-notched-outline__leading {
  border-left: 1px solid;
  border-right: none;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-top-left-radius: var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small));
  border-bottom-left-radius: var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small));
}
.mdc-text-field--outlined .mdc-notched-outline .mdc-notched-outline__leading {
  width: max(12px, var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small)));
}
[dir=rtl] .mdc-notched-outline__leading {
  border-left: none;
  border-right: 1px solid;
  border-bottom-left-radius: 0;
  border-top-left-radius: 0;
  border-top-right-radius: var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small));
  border-bottom-right-radius: var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small));
}

.mdc-notched-outline__trailing {
  flex-grow: 1;
  border-left: none;
  border-right: 1px solid;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-top-right-radius: var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small));
  border-bottom-right-radius: var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small));
}
[dir=rtl] .mdc-notched-outline__trailing {
  border-left: 1px solid;
  border-right: none;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-top-left-radius: var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small));
  border-bottom-left-radius: var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small));
}

.mdc-notched-outline__notch {
  flex: 0 0 auto;
  width: auto;
}
.mdc-text-field--outlined .mdc-notched-outline .mdc-notched-outline__notch {
  max-width: min(var(--%NS%mat-form-field-notch-max-width, 100%), calc(100% - max(12px, var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small))) * 2));
}
.mdc-text-field--outlined .mdc-notched-outline--notched .mdc-notched-outline__notch {
  max-width: min(100%, calc(100% - max(12px, var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small))) * 2));
}
.mdc-text-field--outlined .mdc-notched-outline--notched .mdc-notched-outline__notch {
  padding-top: 1px;
}
.mdc-text-field--focused.mdc-text-field--outlined .mdc-notched-outline--notched .mdc-notched-outline__notch {
  padding-top: 2px;
}
.mdc-notched-outline--notched .mdc-notched-outline__notch {
  padding-left: 0;
  padding-right: 8px;
  border-top: none;
}
[dir=rtl] .mdc-notched-outline--notched .mdc-notched-outline__notch {
  padding-left: 8px;
  padding-right: 0;
}
.mdc-notched-outline--no-label .mdc-notched-outline__notch {
  display: none;
}

.mdc-line-ripple::before, .mdc-line-ripple::after {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  border-bottom-style: solid;
  content: "";
}
.mdc-line-ripple::before {
  z-index: 1;
  border-bottom-width: var(--%NS%mat-form-field-filled-active-indicator-height, 1px);
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) .mdc-line-ripple::before {
  border-bottom-color: var(--%NS%mat-form-field-filled-active-indicator-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled):not(.mdc-text-field--focused):hover .mdc-line-ripple::before {
  border-bottom-color: var(--%NS%mat-form-field-filled-hover-active-indicator-color, var(--%NS%mat-sys-on-surface));
}
.mdc-text-field--filled.mdc-text-field--disabled .mdc-line-ripple::before {
  border-bottom-color: var(--%NS%mat-form-field-filled-disabled-active-indicator-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled).mdc-text-field--invalid .mdc-line-ripple::before {
  border-bottom-color: var(--%NS%mat-form-field-filled-error-active-indicator-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled).mdc-text-field--%NS%invalid:not(.mdc-text-field--focused):hover .mdc-line-ripple::before {
  border-bottom-color: var(--%NS%mat-form-field-filled-error-hover-active-indicator-color, var(--%NS%mat-sys-on-error-container));
}
.mdc-line-ripple::after {
  transform: scaleX(0);
  opacity: 0;
  z-index: 2;
}
.mdc-text-field--filled .mdc-line-ripple::after {
  border-bottom-width: var(--%NS%mat-form-field-filled-focus-active-indicator-height, 2px);
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) .mdc-line-ripple::after {
  border-bottom-color: var(--%NS%mat-form-field-filled-focus-active-indicator-color, var(--%NS%mat-sys-primary));
}
.mdc-text-field--filled.mdc-text-field--%NS%invalid:not(.mdc-text-field--disabled) .mdc-line-ripple::after {
  border-bottom-color: var(--%NS%mat-form-field-filled-error-focus-active-indicator-color, var(--%NS%mat-sys-error));
}

.mdc-line-ripple--%NS%active::after {
  transform: scaleX(1);
  opacity: 1;
}

.mdc-line-ripple--%NS%deactivating::after {
  opacity: 0;
}

.mdc-text-field--disabled {
  pointer-events: none;
}

.mat-mdc-form-field-textarea-control {
  vertical-align: middle;
  resize: vertical;
  box-sizing: border-box;
  height: auto;
  margin: 0;
  padding: 0;
  border: none;
  overflow: auto;
}

.mat-mdc-form-field-input-control.mat-mdc-form-field-input-control {
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  font: inherit;
  letter-spacing: inherit;
  text-decoration: inherit;
  text-transform: inherit;
  border: none;
}

.mat-mdc-form-field .mat-mdc-floating-label.mdc-floating-label {
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  line-height: normal;
  pointer-events: all;
  will-change: auto;
}

.mat-mdc-form-field:not(.mat-form-field-disabled) .mat-mdc-floating-label.mdc-floating-label {
  cursor: inherit;
}

.mdc-text-field--%NS%no-label:not(.mdc-text-field--textarea) .mat-mdc-form-field-input-control.mdc-text-field__input,
.mat-mdc-text-field-wrapper .mat-mdc-form-field-input-control {
  height: auto;
}

.mat-mdc-text-field-wrapper .mat-mdc-form-field-input-control.mdc-text-field__input[type=color] {
  height: 23px;
}

.mat-mdc-text-field-wrapper {
  height: auto;
  flex: auto;
  will-change: auto;
}

.mat-mdc-form-field-has-icon-prefix .mat-mdc-text-field-wrapper {
  padding-left: 0;
  --%NS%mat-mdc-form-field-label-offset-x: -16px;
}

.mat-mdc-form-field-has-icon-suffix .mat-mdc-text-field-wrapper {
  padding-right: 0;
}

[dir=rtl] .mat-mdc-text-field-wrapper {
  padding-left: 16px;
  padding-right: 16px;
}
[dir=rtl] .mat-mdc-form-field-has-icon-suffix .mat-mdc-text-field-wrapper {
  padding-left: 0;
}
[dir=rtl] .mat-mdc-form-field-has-icon-prefix .mat-mdc-text-field-wrapper {
  padding-right: 0;
}

.mat-form-field-disabled .mdc-text-field__input::placeholder {
  color: var(--%NS%mat-form-field-disabled-input-text-placeholder-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mat-form-field-disabled .mdc-text-field__input::-moz-placeholder {
  color: var(--%NS%mat-form-field-disabled-input-text-placeholder-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mat-form-field-disabled .mdc-text-field__input::-webkit-input-placeholder {
  color: var(--%NS%mat-form-field-disabled-input-text-placeholder-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mat-form-field-disabled .mdc-text-field__input:-ms-input-placeholder {
  color: var(--%NS%mat-form-field-disabled-input-text-placeholder-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}

.mat-mdc-form-field-label-always-float .mdc-text-field__input::placeholder {
  transition-delay: 40ms;
  transition-duration: 110ms;
  opacity: 1;
}

.mat-mdc-text-field-wrapper .mat-mdc-form-field-infix .mat-mdc-floating-label {
  left: auto;
  right: auto;
}

.mat-mdc-text-field-wrapper.mdc-text-field--outlined .mdc-text-field__input {
  display: inline-block;
}

.mat-mdc-form-field .mat-mdc-text-field-wrapper.mdc-text-field .mdc-notched-outline__notch {
  padding-top: 0;
}

.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field .mdc-notched-outline__notch {
  border-left: 1px solid transparent;
}

[dir=rtl] .mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field .mdc-notched-outline__notch {
  border-left: none;
  border-right: 1px solid transparent;
}

.mat-mdc-form-field-infix {
  min-height: var(--%NS%mat-form-field-container-height, 56px);
  padding-top: var(--%NS%mat-form-field-filled-with-label-container-padding-top, 24px);
  padding-bottom: var(--%NS%mat-form-field-filled-with-label-container-padding-bottom, 8px);
}
.mdc-text-field--outlined .mat-mdc-form-field-infix, .mdc-text-field--no-label .mat-mdc-form-field-infix {
  padding-top: var(--%NS%mat-form-field-container-vertical-padding, 16px);
  padding-bottom: var(--%NS%mat-form-field-container-vertical-padding, 16px);
}

.mat-mdc-text-field-wrapper .mat-mdc-form-field-flex .mat-mdc-floating-label {
  top: calc(var(--%NS%mat-form-field-container-height, 56px) / 2);
}

.mdc-text-field--filled .mat-mdc-floating-label {
  display: var(--%NS%mat-form-field-filled-label-display, block);
}

.mat-mdc-text-field-wrapper.mdc-text-field--outlined .mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  --%NS%mat-mdc-form-field-label-transform: translateY(calc(calc(6.75px + var(--%NS%mat-form-field-container-height, 56px) / 2) * -1))
    scale(var(--%NS%mat-mdc-form-field-floating-label-scale, 0.75));
  transform: var(--%NS%mat-mdc-form-field-label-transform);
}

@keyframes _mat-form-field-subscript-animation {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.mat-mdc-form-field-subscript-wrapper {
  box-sizing: border-box;
  width: 100%;
  position: relative;
}

.mat-mdc-form-field-hint-wrapper,
.mat-mdc-form-field-error-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 0 16px;
  opacity: 1;
  transform: translateY(0);
  animation: _mat-form-field-subscript-animation 0ms cubic-bezier(0.55, 0, 0.55, 0.2);
}

.mat-mdc-form-field-subscript-dynamic-size .mat-mdc-form-field-hint-wrapper,
.mat-mdc-form-field-subscript-dynamic-size .mat-mdc-form-field-error-wrapper {
  position: static;
}

.mat-mdc-form-field-bottom-align::before {
  content: "";
  display: inline-block;
  height: 16px;
}

.mat-mdc-form-field-bottom-align.mat-mdc-form-field-subscript-dynamic-size::before {
  content: unset;
}

.mat-mdc-form-field-hint-end {
  order: 1;
}

.mat-mdc-form-field-hint-wrapper {
  display: flex;
}

.mat-mdc-form-field-hint-spacer {
  flex: 1 0 1em;
}

.mat-mdc-form-field-error {
  display: block;
  color: var(--%NS%mat-form-field-error-text-color, var(--%NS%mat-sys-error));
}

.mat-mdc-form-field-subscript-wrapper,
.mat-mdc-form-field-bottom-align::before {
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  font-family: var(--%NS%mat-form-field-subscript-text-font, var(--%NS%mat-sys-body-small-font));
  line-height: var(--%NS%mat-form-field-subscript-text-line-height, var(--%NS%mat-sys-body-small-line-height));
  font-size: var(--%NS%mat-form-field-subscript-text-size, var(--%NS%mat-sys-body-small-size));
  letter-spacing: var(--%NS%mat-form-field-subscript-text-tracking, var(--%NS%mat-sys-body-small-tracking));
  font-weight: var(--%NS%mat-form-field-subscript-text-weight, var(--%NS%mat-sys-body-small-weight));
}

.mat-mdc-form-field-focus-overlay {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  opacity: 0;
  pointer-events: none;
  background-color: var(--%NS%mat-form-field-state-layer-color, var(--%NS%mat-sys-on-surface));
}
.mat-mdc-text-field-wrapper:hover .mat-mdc-form-field-focus-overlay {
  opacity: var(--%NS%mat-form-field-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity));
}
.mat-mdc-form-field.mat-focused .mat-mdc-form-field-focus-overlay {
  opacity: var(--%NS%mat-form-field-focus-state-layer-opacity, 0);
}

select.mat-mdc-form-field-input-control {
  -moz-appearance: none;
  -webkit-appearance: none;
  background-color: transparent;
  display: inline-flex;
  box-sizing: border-box;
}
select.mat-mdc-form-field-input-control:not(:disabled) {
  cursor: pointer;
}
select.mat-mdc-form-field-input-control:not(.mat-mdc-native-select-inline) option {
  color: var(--%NS%mat-form-field-select-option-text-color, var(--%NS%mat-sys-neutral10));
}
select.mat-mdc-form-field-input-control:not(.mat-mdc-native-select-inline) option:disabled {
  color: var(--%NS%mat-form-field-select-disabled-option-text-color, color-mix(in srgb, var(--%NS%mat-sys-neutral10) 38%, transparent));
}

.mat-mdc-form-field-type-mat-native-select .mat-mdc-form-field-infix::after {
  content: "";
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid;
  position: absolute;
  right: 0;
  top: 50%;
  margin-top: -2.5px;
  pointer-events: none;
  color: var(--%NS%mat-form-field-enabled-select-arrow-color, var(--%NS%mat-sys-on-surface-variant));
}
[dir=rtl] .mat-mdc-form-field-type-mat-native-select .mat-mdc-form-field-infix::after {
  right: auto;
  left: 0;
}
.mat-mdc-form-field-type-mat-native-select.mat-focused .mat-mdc-form-field-infix::after {
  color: var(--%NS%mat-form-field-focus-select-arrow-color, var(--%NS%mat-sys-primary));
}
.mat-mdc-form-field-type-mat-native-select.mat-form-field-disabled .mat-mdc-form-field-infix::after {
  color: var(--%NS%mat-form-field-disabled-select-arrow-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mat-mdc-form-field-type-mat-native-select .mat-mdc-form-field-input-control {
  padding-right: 15px;
}
[dir=rtl] .mat-mdc-form-field-type-mat-native-select .mat-mdc-form-field-input-control {
  padding-right: 0;
  padding-left: 15px;
}

@media (forced-colors: active) {
  .mat-form-field-appearance-fill .mat-mdc-text-field-wrapper {
    outline: solid 1px;
  }
}
@media (forced-colors: active) {
  .mat-form-field-appearance-fill.mat-form-field-disabled .mat-mdc-text-field-wrapper {
    outline-color: GrayText;
  }
}

@media (forced-colors: active) {
  .mat-form-field-appearance-fill.mat-focused .mat-mdc-text-field-wrapper {
    outline: dashed 3px;
  }
}

@media (forced-colors: active) {
  .mat-mdc-form-field.mat-focused .mdc-notched-outline {
    border: dashed 3px;
  }
}

.mat-mdc-form-field-input-control[type=date], .mat-mdc-form-field-input-control[type=datetime], .mat-mdc-form-field-input-control[type=datetime-local], .mat-mdc-form-field-input-control[type=month], .mat-mdc-form-field-input-control[type=week], .mat-mdc-form-field-input-control[type=time] {
  line-height: 1;
}
.mat-mdc-form-field-input-control::-webkit-datetime-edit {
  line-height: 1;
  padding: 0;
  margin-bottom: -2px;
}

.mat-mdc-form-field {
  --%NS%mat-mdc-form-field-floating-label-scale: 0.75;
  display: inline-flex;
  flex-direction: column;
  min-width: 0;
  text-align: left;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  font-family: var(--%NS%mat-form-field-container-text-font, var(--%NS%mat-sys-body-large-font));
  line-height: var(--%NS%mat-form-field-container-text-line-height, var(--%NS%mat-sys-body-large-line-height));
  font-size: var(--%NS%mat-form-field-container-text-size, var(--%NS%mat-sys-body-large-size));
  letter-spacing: var(--%NS%mat-form-field-container-text-tracking, var(--%NS%mat-sys-body-large-tracking));
  font-weight: var(--%NS%mat-form-field-container-text-weight, var(--%NS%mat-sys-body-large-weight));
}
.mat-mdc-form-field .mdc-text-field--outlined .mdc-floating-label--float-above {
  font-size: calc(var(--%NS%mat-form-field-outlined-label-text-populated-size) * var(--%NS%mat-mdc-form-field-floating-label-scale));
}
.mat-mdc-form-field .mdc-text-field--outlined .mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  font-size: var(--%NS%mat-form-field-outlined-label-text-populated-size);
}
[dir=rtl] .mat-mdc-form-field {
  text-align: right;
}

.mat-mdc-form-field-flex {
  display: inline-flex;
  align-items: baseline;
  box-sizing: border-box;
  width: 100%;
}

.mat-mdc-text-field-wrapper {
  width: 100%;
  z-index: 0;
}

.mat-mdc-form-field-icon-prefix,
.mat-mdc-form-field-icon-suffix {
  align-self: center;
  line-height: 0;
  pointer-events: auto;
  position: relative;
  z-index: 1;
}
.mat-mdc-form-field-icon-prefix > .mat-icon,
.mat-mdc-form-field-icon-suffix > .mat-icon {
  padding: 0 12px;
  box-sizing: content-box;
}

.mat-mdc-form-field-icon-prefix {
  color: var(--%NS%mat-form-field-leading-icon-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-form-field-disabled .mat-mdc-form-field-icon-prefix {
  color: var(--%NS%mat-form-field-disabled-leading-icon-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}

.mat-mdc-form-field-icon-suffix {
  color: var(--%NS%mat-form-field-trailing-icon-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-form-field-disabled .mat-mdc-form-field-icon-suffix {
  color: var(--%NS%mat-form-field-disabled-trailing-icon-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mat-form-field-invalid .mat-mdc-form-field-icon-suffix {
  color: var(--%NS%mat-form-field-error-trailing-icon-color, var(--%NS%mat-sys-error));
}
.mat-form-field-invalid:not(.mat-focused):not(.mat-form-field-disabled) .mat-mdc-text-field-wrapper:hover .mat-mdc-form-field-icon-suffix {
  color: var(--%NS%mat-form-field-error-hover-trailing-icon-color, var(--%NS%mat-sys-on-error-container));
}
.mat-form-field-invalid.mat-focused .mat-mdc-text-field-wrapper .mat-mdc-form-field-icon-suffix {
  color: var(--%NS%mat-form-field-error-focus-trailing-icon-color, var(--%NS%mat-sys-error));
}

.mat-mdc-form-field-icon-prefix,
[dir=rtl] .mat-mdc-form-field-icon-suffix {
  padding: 0 4px 0 0;
}

.mat-mdc-form-field-icon-suffix,
[dir=rtl] .mat-mdc-form-field-icon-prefix {
  padding: 0 0 0 4px;
}

.mat-mdc-form-field-subscript-wrapper .mat-icon,
.mat-mdc-form-field label .mat-icon {
  width: 1em;
  height: 1em;
  font-size: inherit;
}

.mat-mdc-form-field-infix {
  flex: auto;
  min-width: 0;
  width: 180px;
  position: relative;
  box-sizing: border-box;
}
.mat-mdc-form-field-infix:has(textarea[cols]) {
  width: auto;
}

.mat-mdc-form-field .mdc-notched-outline__notch {
  margin-left: -1px;
  -webkit-clip-path: inset(-9em -999em -9em 1px);
  clip-path: inset(-9em -999em -9em 1px);
}
[dir=rtl] .mat-mdc-form-field .mdc-notched-outline__notch {
  margin-left: 0;
  margin-right: -1px;
  -webkit-clip-path: inset(-9em 1px -9em -999em);
  clip-path: inset(-9em 1px -9em -999em);
}

.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-floating-label {
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1), color 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field__input {
  transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field__input::placeholder {
  transition: opacity 67ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field__input::-moz-placeholder {
  transition: opacity 67ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field__input::-webkit-input-placeholder {
  transition: opacity 67ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field__input:-ms-input-placeholder {
  transition: opacity 67ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--no-label .mdc-text-field__input::placeholder, .mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--focused .mdc-text-field__input::placeholder {
  transition-delay: 40ms;
  transition-duration: 110ms;
}
.mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--no-label .mdc-text-field__input::-moz-placeholder, .mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--focused .mdc-text-field__input::-moz-placeholder {
  transition-delay: 40ms;
  transition-duration: 110ms;
}
.mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--no-label .mdc-text-field__input::-webkit-input-placeholder, .mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--focused .mdc-text-field__input::-webkit-input-placeholder {
  transition-delay: 40ms;
  transition-duration: 110ms;
}
.mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--no-label .mdc-text-field__input:-ms-input-placeholder, .mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--focused .mdc-text-field__input:-ms-input-placeholder {
  transition-delay: 40ms;
  transition-duration: 110ms;
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field--%NS%filled:not(.mdc-ripple-upgraded):focus .mdc-text-field__ripple::before {
  transition-duration: 75ms;
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-line-ripple::after {
  transition: transform 180ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mat-mdc-form-field-hint-wrapper,
.mat-mdc-form-field.mat-form-field-animations-enabled .mat-mdc-form-field-error-wrapper {
  animation-duration: 300ms;
}

.mdc-notched-outline .mdc-floating-label {
  max-width: calc(100% + 1px);
}

.mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  max-width: calc(133.3333333333% + 1px);
}
`],encapsulation:2})})()}return n})();var X=(()=>{class n{static ɵfac=function(t){return new(t||n)};static ɵmod=Tr({type:n});static ɵinj=sn$1({imports:[gr,se,vU]})}return n})();var Ln=(()=>{class n{static ɵfac=function(t){return new(t||n)};static ɵcmp=tg({type:n,selectors:[[`ng-component`]],hostAttrs:[`cdk-text-field-style-loader`,``],decls:0,vars:0,template:function(t,i){},styles:[`textarea.cdk-textarea-autosize {
  resize: none;
}

textarea.cdk-textarea-autosize-measuring {
  padding: 2px 0 !important;
  box-sizing: content-box !important;
  height: auto !important;
  overflow: hidden !important;
}

textarea.cdk-textarea-autosize-measuring-firefox {
  padding: 2px 0 !important;
  box-sizing: content-box !important;
  height: 0 !important;
}

@keyframes cdk-text-field-autofill-start { /*!*/ }
@keyframes cdk-text-field-autofill-end { /*!*/ }
.cdk-text-field-autofill-monitored:-webkit-autofill {
  animation: cdk-text-field-autofill-start 0s 1ms;
}

.cdk-text-field-autofill-monitored:not(:-webkit-autofill) {
  animation: cdk-text-field-autofill-end 0s 1ms;
}
`],encapsulation:2})}return n})();var zn={passive:!0};var hn=(()=>{class n{_platform=g(Ru);_ngZone=g(ae);_renderer=g(Bt).createRenderer(null,null);_styleLoader=g(lU);_monitoredElements=new Map;monitor(e){if(!this._platform.isBrowser)return ot;this._styleLoader.load(Ln);let t=cy(e),i=this._monitoredElements.get(t);if(i)return i.subject;let l=new $,b=`cdk-text-field-autofilled`,_=V=>{V.animationName===`cdk-text-field-autofill-start`&&!t.classList.contains(b)?(t.classList.add(b),this._ngZone.run(()=>l.next({target:V.target,isAutofilled:!0}))):V.animationName===`cdk-text-field-autofill-end`&&t.classList.contains(b)&&(t.classList.remove(b),this._ngZone.run(()=>l.next({target:V.target,isAutofilled:!1})))},P=this._ngZone.runOutsideAngular(()=>(t.classList.add(`cdk-text-field-autofill-monitored`),this._renderer.listen(t,`animationstart`,_,zn)));return this._monitoredElements.set(t,{subject:l,unlisten:P}),l}stopMonitoring(e){let t=cy(e),i=this._monitoredElements.get(t);i&&(i.unlisten(),i.subject.complete(),t.classList.remove(`cdk-text-field-autofill-monitored`),t.classList.remove(`cdk-text-field-autofilled`),this._monitoredElements.delete(t))}ngOnDestroy(){this._monitoredElements.forEach((e,t)=>this.stopMonitoring(t))}static ɵfac=function(t){return new(t||n)};static ɵprov=ie({token:n,factory:n.ɵfac})}return n})();var pn=(()=>{class n{static ɵfac=function(t){return new(t||n)};static ɵmod=Tr({type:n});static ɵinj=sn$1({})}return n})();var gn=new I(`MAT_INPUT_VALUE_ACCESSOR`);var bn=(()=>{class n{isErrorState(e,t){return!!(e&&e.invalid&&(e.touched||t&&t.submitted))}isSignalErrorState(e){if(!e)return!1;let t=e().invalid(),i=e().touched();return t&&i}static ɵfac=function(t){return new(t||n)};static ɵprov=ie({token:n,factory:n.ɵfac})}return n})();var qe=class{_defaultMatcher;_parentFormGroup;_parentForm;_stateChanges;errorState=!1;matcher;ngControl;formField;constructor(o,e,t,i,l){this._defaultMatcher=o,this._parentFormGroup=t,this._parentForm=i,this._stateChanges=l,e?lo(e.field)&&!e.updateValueAndValidity?(this.formField=e,this.ngControl=null):(this.formField=null,this.ngControl=e):this.ngControl=this.formField=null}updateErrorState(){let o=this.errorState,e=this._getCurrentErrorState(this.matcher||this._defaultMatcher);e!==o&&(this.errorState=e,this._stateChanges.next())}_getCurrentErrorState(o){if(this.formField&&o?.isSignalErrorState)return o.isSignalErrorState(this.formField.field())??!1;let e=this._parentFormGroup||this._parentForm,t=this.ngControl?this.ngControl.control:null;return o?.isErrorState(t,e)??!1}};var Vn=[`button`,`checkbox`,`file`,`hidden`,`image`,`radio`,`range`,`reset`,`submit`];var Hn=new I(`MAT_INPUT_CONFIG`);var Ke=(()=>{class n{_elementRef=g(Ge);_platform=g(Ru);ngControl=g(St,{optional:!0,self:!0});_autofillMonitor=g(hn);_ngZone=g(ae);_formField=g(ht,{optional:!0});_renderer=g(Sn);_uid=g(uy).getId(`mat-input-`);_previousNativeValue;_inputValueAccessor;_signalBasedValueAccessor;_previousPlaceholder=null;_errorStateTracker;_config=g(Hn,{optional:!0});_cleanupIosKeyup;_cleanupWebkitWheel;_isServer=!1;_isNativeSelect=!1;_isTextarea=!1;_isInFormField=!1;focused=!1;stateChanges=new $;controlType=`mat-input`;autofilled=!1;get disabled(){return this._disabled}set disabled(e){this._disabled=Zr(e),this.focused&&(this.focused=!1,this.stateChanges.next())}_disabled=!1;get id(){return this._id}set id(e){this._id=e||this._uid}_id;placeholder;name;get required(){return this._required??this.ngControl?.control?.hasValidator(rn$1.required)??!1}set required(e){this._required=Zr(e)}_required;get type(){return this._type}set type(e){this._type=e||`text`,this._validateType(),!this._isTextarea&&Vr().has(this._type)&&(this._elementRef.nativeElement.type=this._type)}_type=`text`;get errorStateMatcher(){return this._errorStateTracker.matcher}set errorStateMatcher(e){this._errorStateTracker.matcher=e}userAriaDescribedBy;get value(){return this._signalBasedValueAccessor?this._signalBasedValueAccessor.value():this._inputValueAccessor.value}set value(e){e!==this.value&&(this._signalBasedValueAccessor?this._signalBasedValueAccessor.value.set(e):this._inputValueAccessor.value=e,this.stateChanges.next())}get readonly(){return this._readonly}set readonly(e){this._readonly=Zr(e)}_readonly=!1;disabledInteractive;get errorState(){return this._errorStateTracker.errorState}set errorState(e){this._errorStateTracker.errorState=e}_neverEmptyInputTypes=[`date`,`datetime`,`datetime-local`,`month`,`time`,`week`].filter(e=>Vr().has(e));constructor(){let e=g(Ni,{optional:!0}),t=g(Mi,{optional:!0}),i=g(bn),l=g(gn,{optional:!0,self:!0}),b=g(rn,{optional:!0,self:!0}),_=this._elementRef.nativeElement,P=_.nodeName.toLowerCase();l?lo(l.value)?this._signalBasedValueAccessor=l:this._inputValueAccessor=l:this._inputValueAccessor=_,this._previousNativeValue=this.value,this.id=this.id,this._platform.IOS&&this._ngZone.runOutsideAngular(()=>{this._cleanupIosKeyup=this._renderer.listen(_,`keyup`,this._iOSKeyupListener)}),this._errorStateTracker=new qe(i,b||this.ngControl,t,e,this.stateChanges),this._isServer=!this._platform.isBrowser,this._isNativeSelect=P===`select`,this._isTextarea=P===`textarea`,this._isInFormField=!!this._formField,this.disabledInteractive=this._config?.disabledInteractive||!1,this._isNativeSelect&&(this.controlType=_.multiple?`mat-native-select-multiple`:`mat-native-select`),this._signalBasedValueAccessor&&mn$1(()=>{this._signalBasedValueAccessor.value(),this.stateChanges.next()})}ngAfterViewInit(){this._platform.isBrowser&&this._autofillMonitor.monitor(this._elementRef.nativeElement).subscribe(e=>{this.autofilled=e.isAutofilled,this.stateChanges.next()})}ngOnChanges(){this.stateChanges.next()}ngOnDestroy(){this.stateChanges.complete(),this._platform.isBrowser&&this._autofillMonitor.stopMonitoring(this._elementRef.nativeElement),this._cleanupIosKeyup?.(),this._cleanupWebkitWheel?.()}ngDoCheck(){this.ngControl&&(this.updateErrorState(),this.ngControl.disabled!==null&&this.ngControl.disabled!==this.disabled&&(this.disabled=this.ngControl.disabled,this.stateChanges.next())),this._dirtyCheckNativeValue(),this._dirtyCheckPlaceholder()}focus(e){this._elementRef.nativeElement.focus(e)}updateErrorState(){this._errorStateTracker.updateErrorState()}_focusChanged(e){if(e!==this.focused){if(!this._isNativeSelect&&e&&this.disabled&&this.disabledInteractive){let t=this._elementRef.nativeElement;t.type===`number`?(t.type=`text`,t.setSelectionRange(0,0),t.type=`number`):t.setSelectionRange(0,0)}this.focused=e,this.stateChanges.next()}}_onInput(){}_dirtyCheckNativeValue(){let e=this._elementRef.nativeElement.value;this._previousNativeValue!==e&&(this._previousNativeValue=e,this.stateChanges.next())}_dirtyCheckPlaceholder(){let e=this._getPlaceholder();if(e!==this._previousPlaceholder){let t=this._elementRef.nativeElement;this._previousPlaceholder=e,e?t.setAttribute(`placeholder`,e):t.removeAttribute(`placeholder`)}}_getPlaceholder(){return this.placeholder||null}_validateType(){Vn.indexOf(this._type)}_isNeverEmpty(){return this._neverEmptyInputTypes.indexOf(this._type)>-1}_isBadInput(){let e=this._elementRef.nativeElement.validity;return e&&e.badInput}get empty(){return!this._isNeverEmpty()&&!this._elementRef.nativeElement.value&&!this._isBadInput()&&!this.autofilled}get shouldLabelFloat(){if(this._isNativeSelect){let e=this._elementRef.nativeElement,t=e.options[0];return this.focused||e.multiple||!this.empty||!!(e.selectedIndex>-1&&t&&t.label)}else return this.focused&&!this.disabled||!this.empty}get describedByIds(){return this._elementRef.nativeElement.getAttribute(`aria-describedby`)?.split(` `)||[]}setDescribedByIds(e){let t=this._elementRef.nativeElement;e.length?t.setAttribute(`aria-describedby`,e.join(` `)):t.removeAttribute(`aria-describedby`)}onContainerClick(){this.focused||this.focus()}_isInlineSelect(){let e=this._elementRef.nativeElement;return this._isNativeSelect&&(e.multiple||e.size>1)}_iOSKeyupListener=e=>{let t=e.target;!t.value&&t.selectionStart===0&&t.selectionEnd===0&&(t.setSelectionRange(1,1),t.setSelectionRange(0,0))};_getReadonlyAttribute(){return this._isNativeSelect?null:this.readonly||this.disabled&&this.disabledInteractive?`true`:null}static ɵfac=function(t){return new(t||n)};static ɵdir=Sr({type:n,selectors:[[`input`,`matInput`,``],[`textarea`,`matInput`,``],[`select`,`matNativeControl`,``],[`input`,`matNativeControl`,``],[`textarea`,`matNativeControl`,``]],hostAttrs:[1,`mat-mdc-input-element`],hostVars:21,hostBindings:function(t,i){t&1&&Tg(`focus`,function(){return i._focusChanged(!0)})(`blur`,function(){return i._focusChanged(!1)})(`input`,function(){return i._onInput()}),t&2&&(Ig(`id`,i.id)(`disabled`,i.disabled&&!i.disabledInteractive)(`required`,i.required),eu(`name`,i.name||null)(`readonly`,i._getReadonlyAttribute())(`aria-disabled`,i.disabled&&i.disabledInteractive?`true`:null)(`aria-invalid`,i.empty&&i.required?null:i.errorState)(`aria-required`,i.required)(`id`,i.id),lu(`mat-input-server`,i._isServer)(`mat-mdc-form-field-textarea-control`,i._isInFormField&&i._isTextarea)(`mat-mdc-form-field-input-control`,i._isInFormField)(`mat-mdc-input-disabled-interactive`,i.disabledInteractive)(`mdc-text-field__input`,i._isInFormField)(`mat-mdc-native-select-inline`,i._isInlineSelect()))},inputs:{disabled:`disabled`,id:`id`,placeholder:`placeholder`,name:`name`,required:`required`,type:`type`,errorStateMatcher:`errorStateMatcher`,userAriaDescribedBy:[0,`aria-describedby`,`userAriaDescribedBy`],value:`value`,readonly:`readonly`,disabledInteractive:[2,`disabledInteractive`,`disabledInteractive`,cm]},exportAs:[`matInput`],features:[du([{provide:ut,useExisting:n}]),ws]})}return n})();var We=(()=>{class n{static ɵfac=function(t){return new(t||n)};static ɵmod=Tr({type:n});static ɵinj=sn$1({imports:[X,X,pn,vU]})}return n})();var Kn=n=>({count:n});function Wn(n,o){if(n&1&&(Ds(0,`p`,2),PI(1),nu()),n&2){let e=dI();vh(),Ug(e.i18n.t(`passwordDialog.chooseHint`))}}function Un(n,o){if(n&1&&(Ds(0,`mat-hint`),PI(1),nu()),n&2){let e=dI();vh(),Ug(e.i18n.t(`passwordDialog.minLength`,ZI(1,Kn,e.minLength)))}}function Gn(n,o){if(n&1&&(Ds(0,`mat-hint`,9),PI(1),nu()),n&2){let e=dI(2);vh(),Ug(e.i18n.t(`passwordDialog.mismatch`))}}function $n(n,o){if(n&1){let e=sI();Ds(0,`mat-form-field`)(1,`mat-label`),PI(2),nu(),Ds(3,`input`,8),pE(),Gg(`ngModelChange`,function(i){tf(e);let l=dI();return HI(l.repeated,i)||(l.repeated=i),nf(i)}),nu(),Zw(4,Gn,2,1,`mat-hint`,9),nu()}if(n&2){let e=dI();vh(2),Ug(e.i18n.t(`passwordDialog.repeat`)),vh(),Wg(`ngModel`,e.repeated),gE(),vh(),Kw(e.mismatch()?4:-1)}}function Yn(n,o){if(n&1){let e=sI();Ds(0,`mat-checkbox`,10),pE(),Gg(`ngModelChange`,function(i){tf(e);let l=dI();return HI(l.keepHistory,i)||(l.keepHistory=i),nf(i)}),PI(1),nu()}if(n&2){let e=dI();Wg(`ngModel`,e.keepHistory),gE(),vh(),uu(` `,e.i18n.t(`passwordDialog.keepHistory`),` `)}}var Ue=class n{data=g(Ui);i18n=g(sy);dialog=g(Zt);minLength=8;password=fe(``);repeated=fe(``);keepHistory=fe(!1);tooShort=js(()=>!this.data.passwordSet&&this.password().length<8);mismatch=js(()=>!this.data.passwordSet&&this.repeated()!==``&&this.repeated()!==this.password());canConfirm=js(()=>this.data.passwordSet?this.password()!==``:!this.tooShort()&&this.repeated()===this.password());question=js(()=>{let o=this.data.deviceName;switch(this.data.action){case`add`:return this.i18n.t(`passwordDialog.add`,{device:o});case`remove`:return this.i18n.t(`passwordDialog.remove`,{device:o});case`kind`:return this.i18n.t(`passwordDialog.kind`,{device:o,kind:CH(this.data.kind??`server`,this.i18n)})}});confirmLabel=js(()=>{switch(this.data.action){case`add`:return this.i18n.t(`passwordDialog.confirmAdd`);case`remove`:return this.i18n.t(`passwordDialog.confirmRemove`);case`kind`:return this.i18n.t(`passwordDialog.confirmKind`)}});confirm(){this.canConfirm()&&this.dialog.close({password:this.password(),keepHistory:this.keepHistory()})}static ɵfac=function(e){return new(e||n)};static ɵcmp=tg({type:n,selectors:[[`app-password-dialog`]],decls:19,vars:12,consts:[[`mat-dialog-title`,``],[3,`ngSubmit`],[1,`hint`],[`matInput`,``,`type`,`password`,`name`,`password`,`cdkFocusInitial`,``,3,`ngModelChange`,`autocomplete`,`ngModel`],[`name`,`keepHistory`,3,`ngModel`],[`align`,`end`],[`mat-button`,``,`type`,`button`,`mat-dialog-close`,``],[`mat-flat-button`,``,`type`,`submit`,3,`disabled`],[`matInput`,``,`type`,`password`,`name`,`repeated`,`autocomplete`,`new-password`,3,`ngModelChange`,`ngModel`],[1,`error`],[`name`,`keepHistory`,3,`ngModelChange`,`ngModel`]],template:function(e,t){e&1&&(Ds(0,`h2`,0),PI(1),nu(),Ds(2,`form`,1),Tg(`ngSubmit`,function(){return t.confirm()}),Ds(3,`mat-dialog-content`)(4,`p`),PI(5),nu(),Zw(6,Wn,2,1,`p`,2),Ds(7,`mat-form-field`)(8,`mat-label`),PI(9),nu(),Ds(10,`input`,3),pE(),Gg(`ngModelChange`,function(l){return HI(t.password,l)||(t.password=l),l}),nu(),Zw(11,Un,2,3,`mat-hint`),nu(),Zw(12,$n,5,3,`mat-form-field`),Zw(13,Yn,2,2,`mat-checkbox`,4),nu(),Ds(14,`mat-dialog-actions`,5)(15,`button`,6),PI(16),nu(),Ds(17,`button`,7),PI(18),nu()()()),e&2&&(vh(),uu(` `,t.i18n.t(t.data.passwordSet?`passwordDialog.enterTitle`:`passwordDialog.chooseTitle`),`
`),vh(4),Ug(t.question()),vh(),Kw(t.data.passwordSet?-1:6),vh(3),Ug(t.i18n.t(`passwordDialog.password`)),vh(),Dg(`autocomplete`,t.data.passwordSet?`current-password`:`new-password`),Wg(`ngModel`,t.password),gE(),vh(),Kw(t.data.passwordSet?-1:11),vh(),Kw(t.data.passwordSet?-1:12),vh(),Kw(t.data.action===`remove`?13:-1),vh(3),Ug(t.i18n.t(`passwordDialog.cancel`)),vh(),Dg(`disabled`,!t.canConfirm()),vh(),uu(` `,t.confirmLabel(),` `))},dependencies:[rc,ic,Ra,nc,ac,Ii,Ni,Vs,Ps,wc,Ti,bd,ud,pd,hd,X,se,Z,Q,We,Ke],styles:[`mat-dialog-content[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:.5rem;max-width:26rem}p[_ngcontent-%COMP%]{margin:0 0 .5rem}.hint[_ngcontent-%COMP%]{color:var(--%NS%mat-sys-on-surface-variant)}.error[_ngcontent-%COMP%]{color:var(--%NS%mat-sys-error)}`]})};var Zn=n=>({device:n});var Qn=(n,o)=>o.id;function Xn(n,o){if(n&1){let e=sI();Ds(0,`h3`)(1,`button`,11),Tg(`click`,function(){tf(e);let i=dI();return nf(i.toggleList())}),bg(2,`span`,12),PI(3),Ds(4,`span`,13),PI(5),nu()()()}if(n&2){let e=dI();vh(),eu(`aria-expanded`,e.listOpen()),vh(2),uu(``,e.i18n.t(`devicesDialog.listTitle`),` `),vh(2),Ug(e.others().length)}}function Jn(n,o){if(n&1&&(Ds(0,`span`,17),PI(1),nu()),n&2){let e=dI(2);vh(),Ug(e.i18n.t(`devicesDialog.router`))}}function ei(n,o){if(n&1){let e=sI();Ds(0,`button`,21),Tg(`click`,function(){let i=tf(e).$implicit,l=dI(2).$implicit,b=dI();return nf(b.setKind(l,i))}),PI(1),nu()}if(n&2){let e=o.$implicit,t=dI(2).$implicit,i=dI();Dg(`disabled`,i.busy()),eu(`aria-pressed`,t.kind===e),vh(),uu(` `,i.kindName(e),` `)}}function ti(n,o){if(n&1&&(Ds(0,`span`,6),Xw(1,ei,2,3,`button`,20,Jw),nu()),n&2){let e=dI().$implicit,t=dI();eu(`aria-label`,t.i18n.t(`devicesDialog.kindOf`,ZI(1,Zn,e.name))),vh(),eI(t.kinds)}}function ni(n,o){if(n&1){let e=sI();Ds(0,`button`,22),Tg(`click`,function(){tf(e);let i=dI().$implicit,l=dI();return nf(l.remove(i))}),PI(1),nu()}if(n&2){let e=dI(2);Dg(`disabled`,e.busy()),vh(),uu(` `,e.i18n.t(`devicesDialog.remove`),` `)}}function ii(n,o){if(n&1&&(Ds(0,`span`,19),PI(1),nu()),n&2){let e=dI(2);vh(),Ug(e.i18n.t(`devicesDialog.fixed`))}}function ri(n,o){if(n&1&&(Ds(0,`li`)(1,`span`,14)(2,`span`,15),PI(3),nu(),Ds(4,`span`,16),PI(5),nu()(),Zw(6,Jn,2,1,`span`,17)(7,ti,3,3,`span`,6),Zw(8,ni,2,2,`button`,18)(9,ii,2,1,`span`,19),nu()),n&2){let e=o.$implicit;vh(3),Ug(e.name),vh(2),Ug(e.address),vh(),Kw(e.router?6:7),vh(2),Kw(e.removable?8:9)}}function oi(n,o){if(n&1&&(Ds(0,`li`,1),PI(1),nu()),n&2){let e=dI();vh(),Ug(e.i18n.t(`devicesDialog.empty`))}}function ai(n,o){if(n&1&&(Ds(0,`p`,1),PI(1),nu()),n&2){let e=dI();vh(),Ug(e.i18n.t(`devicesDialog.suggested`))}}function li(n,o){if(n&1){let e=sI();Ds(0,`button`,23),Tg(`click`,function(){let i=tf(e).$implicit,l=dI();return nf(l.kind.set(i))}),PI(1),nu()}if(n&2){let e=o.$implicit,t=dI();eu(`aria-pressed`,e===t.kind()),vh(),uu(` `,t.kindName(e),` `)}}function di(n,o){if(n&1&&(Ds(0,`p`,8),PI(1),nu()),n&2){let e=dI();vh(),Ug(e.problem())}}var pt=class n{i18n=g(sy);devices=g(Km);dialog=g(yo);destroyRef=g(oe);host=g(Ge);others=js(()=>this.devices.devices().slice(1));listOpen=fe(!0);listToggled=fe(!1);name=fe(``);address=fe(``);kind=fe(`server`);kinds=EH;problem=fe(``);busy=fe(!1);changeStarted=new $;suggestion=fe(null);suggested=js(()=>this.suggestion()?.address===this.address().trim());constructor(){let o=fe(0);Lr(window,`resize`).pipe(sH()).subscribe(()=>o.update(e=>e+1)),Uj(()=>{if(this.others(),this.suggested(),o(),this.listToggled()||!this.listOpen())return;let e=this.host.nativeElement.querySelector(`ul`);if(!e||e.scrollHeight<=e.clientHeight)return;let t=e.querySelector(`li`)?.offsetHeight||si(5);e.clientHeight<t&&this.listOpen.set(!1)}),this.devices.suggestion().pipe(ti$1(()=>Fr(null)),sH()).subscribe(e=>{!e||this.name()||this.address()||(this.suggestion.set(e),this.name.set(e.name),this.address.set(e.address),this.kind.set(e.kind))})}toggleList(){this.listToggled.set(!0),this.listOpen.update(o=>!o)}add(){let o=this.name().trim(),e=this.address().trim();if(!o||!e)return;let t=this.kind();this.change({action:`add`,deviceName:o},i=>this.devices.add(o,e,t,i.password)).subscribe(()=>{this.name.set(``),this.address.set(``),this.kind.set(`server`)})}kindName(o){return CH(o,this.i18n)}setKind(o,e){o.kind!==e&&this.change({action:`kind`,deviceName:o.name,kind:e},t=>this.devices.setKind(o.id,e,t.password)).subscribe()}remove(o){this.change({action:`remove`,deviceName:o.name},e=>this.devices.remove(o.id,e.password,e.keepHistory)).subscribe()}change(o,e){let t=Q$1(H({},o),{passwordSet:this.devices.passwordSet()});return this.dialog.open(Ue,{data:t}).afterClosed().pipe(It(i=>i!==void 0),oi$1(()=>{this.changeStarted.next(),this.busy.set(!0),this.problem.set(``)}),Vn$1(i=>e(i).pipe(Vn$1(()=>this.devices.load().pipe(sH(this.destroyRef),ti$1(()=>Fr(null)))))),ti$1(i=>(this.problem.set(SH(i,this.i18n)),this.busy.set(!1),this.devices.load().pipe(Pr(this.changeStarted),sH(this.destroyRef),ma(),ti$1(()=>ot)))),ri$1(()=>this.busy.set(!1)))}static ɵfac=function(e){return new(e||n)};static ɵcmp=tg({type:n,selectors:[[`app-devices-dialog`]],decls:35,vars:18,consts:[[`mat-dialog-title`,``],[1,`hint`],[`id`,`devices-dialog-list`,3,`hidden`],[`id`,`devices-dialog-add`,3,`ngSubmit`],[`matInput`,``,`name`,`name`,`maxlength`,`64`,`autocomplete`,`off`,3,`ngModelChange`,`ngModel`],[`matInput`,``,`name`,`address`,`placeholder`,`192.168.1.20:9393`,`autocomplete`,`off`,3,`ngModelChange`,`ngModel`],[`role`,`group`,1,`choices`,`kind`],[`type`,`button`],[`role`,`alert`,1,`error`],[`mat-flat-button`,``,`type`,`submit`,`form`,`devices-dialog-add`,3,`disabled`],[`mat-button`,``,`type`,`button`,`mat-dialog-close`,``],[`type`,`button`,`aria-controls`,`devices-dialog-list`,1,`fold`,3,`click`],[`aria-hidden`,`true`,1,`chevron`],[1,`count`],[1,`who`],[1,`name`],[1,`address`],[1,`router`],[`mat-button`,``,`type`,`button`,3,`disabled`],[1,`fixed`],[`type`,`button`,3,`disabled`],[`type`,`button`,3,`click`,`disabled`],[`mat-button`,``,`type`,`button`,3,`click`,`disabled`],[`type`,`button`,3,`click`]],template:function(e,t){e&1&&(Ds(0,`h2`,0),PI(1),nu(),Ds(2,`mat-dialog-content`)(3,`p`,1),PI(4),nu(),Zw(5,Xn,6,3,`h3`),Ds(6,`ul`,2),Xw(7,ri,10,4,`li`,null,Qn,!1,oi,2,1,`li`,1),nu(),Ds(10,`form`,3),Tg(`ngSubmit`,function(){return t.add()}),Ds(11,`h3`),PI(12),nu(),Zw(13,ai,2,1,`p`,1),Ds(14,`mat-form-field`)(15,`mat-label`),PI(16),nu(),Ds(17,`input`,4),pE(),Gg(`ngModelChange`,function(l){return HI(t.name,l)||(t.name=l),l}),nu()(),Ds(18,`mat-form-field`)(19,`mat-label`),PI(20),nu(),Ds(21,`input`,5),pE(),Gg(`ngModelChange`,function(l){return HI(t.address,l)||(t.address=l),l}),nu(),Ds(22,`mat-hint`),PI(23),nu()(),Ds(24,`div`,6),Xw(25,li,2,2,`button`,7,Jw),nu(),Ds(27,`p`,1),PI(28),nu()(),Zw(29,di,2,1,`p`,8),nu(),Ds(30,`mat-dialog-actions`)(31,`button`,9),PI(32),nu(),Ds(33,`button`,10),PI(34),nu()()),e&2&&(vh(),Ug(t.i18n.t(`devicesDialog.title`)),vh(3),Ug(t.i18n.t(`devicesDialog.intro`)),vh(),Kw(t.others().length?5:-1),vh(),Dg(`hidden`,!t.listOpen()),vh(),eI(t.others()),vh(5),Ug(t.i18n.t(`devicesDialog.addTitle`)),vh(),Kw(t.suggested()?13:-1),vh(3),Ug(t.i18n.t(`devicesDialog.name`)),vh(),Wg(`ngModel`,t.name),gE(),vh(3),Ug(t.i18n.t(`devicesDialog.address`)),vh(),Wg(`ngModel`,t.address),gE(),vh(2),Ug(t.i18n.t(`devicesDialog.addressHint`)),vh(),eu(`aria-label`,t.i18n.t(`devicesDialog.kind`)),vh(),eI(t.kinds),vh(3),Ug(t.i18n.t(`devicesDialog.kindHint`)),vh(),Kw(t.problem()?29:-1),vh(2),Dg(`disabled`,t.busy()||!t.name().trim()||!t.address().trim()),vh(),uu(` `,t.i18n.t(`devicesDialog.add`),` `),vh(2),Ug(t.i18n.t(`devicesDialog.close`)))},dependencies:[rc,ic,Ra,nc,ac,ui,Ii,Ni,Vs,Ps,bd,ud,pd,hd,X,se,Z,Q,We,Ke],styles:[`mat-dialog-content[_ngcontent-%COMP%]{display:flex;flex-direction:column;max-width:32rem}mat-dialog-content[_ngcontent-%COMP%] > *[_ngcontent-%COMP%]{flex-shrink:0}p[_ngcontent-%COMP%]{margin:0 0 .75rem}.hint[_ngcontent-%COMP%], .address[_ngcontent-%COMP%], .router[_ngcontent-%COMP%], .fixed[_ngcontent-%COMP%]{color:var(--%NS%mat-sys-on-surface-variant)}mat-dialog-content[_ngcontent-%COMP%] > ul[_ngcontent-%COMP%]{flex-shrink:1;min-height:2.5rem;margin:0 0 1rem;padding:0;overflow-y:auto;overscroll-behavior:contain;list-style:none}li[_ngcontent-%COMP%]{display:flex;flex-wrap:wrap;align-items:center;gap:.25rem .75rem;min-height:2.5rem;padding:.375rem 0;border-bottom:1px solid var(--%NS%mat-sys-outline-variant)}.who[_ngcontent-%COMP%]{display:flex;flex-wrap:wrap;gap:0 .75rem;flex-basis:100%}.router[_ngcontent-%COMP%]{font:var(--%NS%mat-sys-label-medium)}.kind[_ngcontent-%COMP%] > button[_ngcontent-%COMP%]{height:1.75rem;font:var(--%NS%mat-sys-label-medium)}form[_ngcontent-%COMP%]   .kind[_ngcontent-%COMP%]{flex-basis:100%;margin-bottom:.5rem}.name[_ngcontent-%COMP%]{font-weight:500}li[_ngcontent-%COMP%]   button[_ngcontent-%COMP%], .fixed[_ngcontent-%COMP%]{margin-left:auto}h3[_ngcontent-%COMP%]{margin:0 0 .75rem;font:var(--%NS%mat-sys-title-small)}.fold[_ngcontent-%COMP%]{display:inline-flex;align-items:center;gap:.5rem;margin-left:-.5rem;padding:.25rem .5rem;border:none;border-radius:var(--%NS%mat-sys-corner-small);background:none;color:var(--%NS%mat-sys-on-surface);font:inherit;cursor:pointer}.fold[_ngcontent-%COMP%]:hover{background:var(--%NS%mat-sys-surface-container-high)}.fold[_ngcontent-%COMP%]:focus-visible{outline:2px solid var(--%NS%mat-sys-primary)}.chevron[_ngcontent-%COMP%]:before{content:"";display:block;width:.5rem;height:.5rem;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:translateY(-25%) rotate(45deg);transition:transform .15s}.fold[aria-expanded=false][_ngcontent-%COMP%]   .chevron[_ngcontent-%COMP%]:before{transform:rotate(-45deg)}.count[_ngcontent-%COMP%]{font:var(--%NS%mat-sys-body-medium);color:var(--%NS%mat-sys-on-surface-variant)}ul[hidden][_ngcontent-%COMP%]{display:none}form[_ngcontent-%COMP%]{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 .75rem}mat-dialog-actions[_ngcontent-%COMP%]{justify-content:space-between}form[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%], form[_ngcontent-%COMP%]   .hint[_ngcontent-%COMP%]{flex-basis:100%}mat-form-field[_ngcontent-%COMP%]{flex:1 1 12rem}.error[_ngcontent-%COMP%]{margin-top:.75rem;color:var(--%NS%mat-sys-error)}`]})};function si(n){return n*parseFloat(getComputedStyle(document.documentElement).fontSize)}function Xo(n){n.get(yo).open(pt,{autoFocus:`first-tabbable`,injector:n})}export{Xo as openDevicesDialog};