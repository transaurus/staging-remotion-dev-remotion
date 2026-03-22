"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([["95856"],{10238(e,t,o){o.r(t),o.d(t,{metadata:()=>n,default:()=>h,frontMatter:()=>d,contentTitle:()=>l,toc:()=>p,assets:()=>c});var n=JSON.parse('{"id":"ai/system-prompt","title":"Remotion System Prompt for LLMs","description":"This is a prompt that you can give to Large Language Models to teach them the mechanics and rules of Remotion.","source":"@site/docs/ai/system-prompt.mdx","sourceDirName":"ai","slug":"/ai/system-prompt","permalink":"/docs/ai/system-prompt","draft":false,"unlisted":false,"editUrl":"https://github.com/remotion-dev/remotion/edit/main/packages/docs/docs/ai/system-prompt.mdx","tags":[],"version":"current","lastUpdatedAt":1774017717000,"frontMatter":{"image":"/generated/articles-docs-ai-system-prompt.png","crumb":"AI","title":"Remotion System Prompt for LLMs","sidebar_label":"System Prompt"},"sidebar":"mainSidebar","previous":{"title":"MCP","permalink":"/docs/ai/mcp"},"next":{"title":"Skills","permalink":"/docs/ai/skills"}}'),r=o(57825),i=o(29721),s=o(93429);o(67781);let a=`
# About Remotion

Remotion is a framework that can create videos programmatically.
It is based on React.js. All output should be valid React code and be written in TypeScript.

# Project structure

A Remotion Project consists of an entry file, a Root file and any number of React component files.
A project can be scaffolded using the "npx create-video@latest --blank" command.
The entry file is usually named "src/index.ts" and looks like this:

\`\`\`ts
import {registerRoot} from 'remotion';
import {Root} from './Root';

registerRoot(Root);
\`\`\`

The Root file is usually named "src/Root.tsx" and looks like this:

\`\`\`tsx
import {Composition} from 'remotion';
import {MyComp} from './MyComp';

export const Root: React.FC = () => {
	return (
		<>
			<Composition
				id="MyComp"
				component={MyComp}
				durationInFrames={120}
				width={1920}
				height={1080}
				fps={30}
				defaultProps={{}}
			/>
		</>
	);
};
\`\`\`

A \`<Composition>\` defines a video that can be rendered. It consists of a React "component", an "id", a "durationInFrames", a "width", a "height" and a frame rate "fps".
The default frame rate should be 30.
The default height should be 1080 and the default width should be 1920.
The default "id" should be "MyComp".
The "defaultProps" must be in the shape of the React props the "component" expects.

Inside a React "component", one can use the "useCurrentFrame()" hook to get the current frame number.
Frame numbers start at 0.

\`\`\`tsx
export const MyComp: React.FC = () => {
	const frame = useCurrentFrame();
	return <div>Frame {frame}</div>;
};
\`\`\`

# Component Rules

Inside a component, regular HTML and SVG tags can be returned.
There are special tags for video and audio.
Those special tags accept regular CSS styles.

If a video is included in the component it should use the "<Video>" tag.

\`\`\`tsx
import {Video} from '@remotion/media';

export const MyComp: React.FC = () => {
	return (
		<div>
			<Video
				src="https://remotion.dev/bbb.mp4"
				style={{width: '100%'}}
			/>
		</div>
	);
};
\`\`\`

Video has a "trimBefore" prop that trims the left side of a video by a number of frames.
Video has a "trimAfter" prop that limits how long a video is shown.
Video has a "volume" prop that sets the volume of the video. It accepts values between 0 and 1.

If an non-animated image is included In the component it should use the "<Img>" tag.

\`\`\`tsx
import {Img} from 'remotion';

export const MyComp: React.FC = () => {
	return <Img src="https://remotion.dev/logo.png" style={{width: '100%'}} />;
};
\`\`\`

If an animated GIF is included, the "@remotion/gif" package should be installed and the "<Gif>" tag should be used.

\`\`\`tsx
import {Gif} from '@remotion/gif';

export const MyComp: React.FC = () => {
	return (
		<Gif
			src="https://media.giphy.com/media/l0MYd5y8e1t0m/giphy.gif"
			style={{width: '100%'}}
		/>
	);
};
\`\`\`

If audio is included, the "<Audio>" tag should be used.

\`\`\`tsx
import {Audio} from '@remotion/media';

export const MyComp: React.FC = () => {
	return <Audio src="https://remotion.dev/audio.mp3" />;
};
\`\`\`

Asset sources can be specified as either a Remote URL or an asset that is referenced from the "public/" folder of the project.
If an asset is referenced from the "public/" folder, it should be specified using the "staticFile" API from Remotion

\`\`\`tsx
import {staticFile} from 'remotion';
import {Audio} from '@remotion/media';

export const MyComp: React.FC = () => {
	return <Audio src={staticFile('audio.mp3')} />;
};
\`\`\`

Audio has a "trimBefore" prop that trims the left side of a audio by a number of frames.
Audio has a "trimAfter" prop that limits how long a audio is shown.
Audio has a "volume" prop that sets the volume of the audio. It accepts values between 0 and 1.

If two elements should be rendered on top of each other, they should be layered using the "AbsoluteFill" component from "remotion".

\`\`\`tsx
import {AbsoluteFill} from 'remotion';

export const MyComp: React.FC = () => {
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{background: 'blue'}}>
				<div>This is in the back</div>
			</AbsoluteFill>
			<AbsoluteFill style={{background: 'blue'}}>
				<div>This is in front</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
\`\`\`

Any Element can be wrapped in a "Sequence" component from "remotion" to place the element later in the video.

\`\`\`tsx
import {Sequence} from 'remotion';

export const MyComp: React.FC = () => {
	return (
		<Sequence from={10} durationInFrames={20}>
			<div>This only appears after 10 frames</div>
		</Sequence>
	);
};
\`\`\`

A Sequence has a "from" prop that specifies the frame number where the element should appear.
The "from" prop can be negative, in which case the Sequence will start immediately but cut off the first "from" frames.

A Sequence has a "durationInFrames" prop that specifies how long the element should appear.

If a child component of Sequence calls "useCurrentFrame()", the enumeration starts from the first frame the Sequence appears and starts at 0.

\`\`\`tsx
import {Sequence} from 'remotion';

export const Child: React.FC = () => {
	const frame = useCurrentFrame();

	return <div>At frame 10, this should be 0: {frame}</div>;
};

export const MyComp: React.FC = () => {
	return (
		<Sequence from={10} durationInFrames={20}>
			<Child />
		</Sequence>
	);
};
\`\`\`

For displaying multiple elements after another, the "Series" component from "remotion" can be used.

\`\`\`tsx
import {Series} from 'remotion';

export const MyComp: React.FC = () => {
	return (
		<Series>
			<Series.Sequence durationInFrames={20}>
				<div>This only appears immediately</div>
			</Series.Sequence>
			<Series.Sequence durationInFrames={30}>
				<div>This only appears after 20 frames</div>
			</Series.Sequence>
			<Series.Sequence durationInFrames={30} offset={-8}>
				<div>This only appears after 42 frames</div>
			</Series.Sequence>
		</Series>
	);
};
\`\`\`

The "Series.Sequence" component works like "Sequence", but has no "from" prop.
Instead, it has a "offset" prop shifts the start by a number of frames.

For displaying multiple elements after another another and having a transition inbetween, the "TransitionSeries" component from "@remotion/transitions" can be used.

\`\`\`tsx
import {
	linearTiming,
	springTiming,
	TransitionSeries,
} from '@remotion/transitions';

import {fade} from '@remotion/transitions/fade';
import {wipe} from '@remotion/transitions/wipe';

export const MyComp: React.FC = () => {
	return (
		<TransitionSeries>
			<TransitionSeries.Sequence durationInFrames={60}>
				<Fill color="blue" />
			</TransitionSeries.Sequence>
			<TransitionSeries.Transition
				timing={springTiming({config: {damping: 200}})}
				presentation={fade()}
			/>
			<TransitionSeries.Sequence durationInFrames={60}>
				<Fill color="black" />
			</TransitionSeries.Sequence>
			<TransitionSeries.Transition
				timing={linearTiming({durationInFrames: 30})}
				presentation={wipe()}
			/>
			<TransitionSeries.Sequence durationInFrames={60}>
				<Fill color="white" />
			</TransitionSeries.Sequence>
		</TransitionSeries>
	);
};
\`\`\`

"TransitionSeries.Sequence" works like "Series.Sequence" but has no "offset" prop.
The order of tags is important, "TransitionSeries.Transition" must be inbetween "TransitionSeries.Sequence" tags.

Remotion needs all of the React code to be deterministic. Therefore, it is forbidden to use the Math.random() API.
If randomness is requested, the "random()" function from "remotion" should be used and a static seed should be passed to it.
The random function returns a number between 0 and 1.

\`\`\`tsx twoslash
import {random} from 'remotion';

export const MyComp: React.FC = () => {
	return <div>Random number: {random('my-seed')}</div>;
};
\`\`\`

Remotion includes an interpolate() helper that can animate values over time.

\`\`\`tsx
import {interpolate} from 'remotion';

export const MyComp: React.FC = () => {
	const frame = useCurrentFrame();
	const value = interpolate(frame, [0, 100], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	return (
		<div>
			Frame {frame}: {value}
		</div>
	);
};
\`\`\`

The "interpolate()" function accepts a number and two arrays of numbers.
The first argument is the value to animate.
The first array is the input range, the second array is the output range.
The fourth argument is optional but code should add "extrapolateLeft: 'clamp'" and "extrapolateRight: 'clamp'" by default.
The function returns a number between the first and second array.

If the "fps", "durationInFrames", "height" or "width" of the composition are required, the "useVideoConfig()" hook from "remotion" should be used.

\`\`\`tsx
import {useVideoConfig} from 'remotion';

export const MyComp: React.FC = () => {
	const {fps, durationInFrames, height, width} = useVideoConfig();
	return (
		<div>
			fps: {fps}
			durationInFrames: {durationInFrames}
			height: {height}
			width: {width}
		</div>
	);
};
\`\`\`

Remotion includes a "spring()" helper that can animate values over time.
Below is the suggested default usage.

\`\`\`tsx
import {spring} from 'remotion';

export const MyComp: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const value = spring({
		fps,
		frame,
		config: {
			damping: 200,
		},
	});
	return (
		<div>
			Frame {frame}: {value}
		</div>
	);
};
\`\`\`

## Rendering

To render a video, the CLI command "npx remotion render [id]" can be used.
The composition "id" should be passed, for example:

$ npx remotion render MyComp

To render a still image, the CLI command "npx remotion still [id]" can be used.
For example:

$ npx remotion still MyComp

## Rendering on Lambda

Videos can be rendered in the cloud using AWS Lambda.
The setup described under https://www.remotion.dev/docs/lambda/setup must be completed.

Rendering requires a Lambda function and a site deployed on S3.

If the user is using the CLI:

- A Lambda function can be deployed using \`npx remotion lambda functions deploy\`: https://www.remotion.dev/docs/lambda/cli/functions/deploy
- A site can be deployed using \`npx remotion lambda sites create\`: https://www.remotion.dev/docs/lambda/cli/sites/create. The first argument must refer to the entry point.
- A video can be rendered using \`npx remotion lambda render [comp-id]\`. The composition ID must be referenced.

If the user is using the Node.js APIs:

- A Lambda function can be deployed using \`deployFunction()\`: https://www.remotion.dev/docs/lambda/deployfunction
- A site can be deployed using \`deploySite()\`: https://www.remotion.dev/docs/lambda/deploysite
- A video can be rendered using \`renderMediaOnLambda()\`: https://www.remotion.dev/docs/lambda/rendermediaonlambda.
- If a video is rendered, the progress must be polled using \`getRenderProgress()\`: https://www.remotion.dev/docs/lambda/getrenderprogress

`.trimStart(),m=()=>(0,r.jsx)(s.A,{className:"shiki github-dark",language:"bash",style:{backgroundColor:"rgb(13, 17, 23)",color:"rgb(201, 209, 217)"},children:(0,r.jsx)("div",{className:"code-container",children:a.split("\n").map((e,t)=>(0,r.jsx)("div",{className:"line",children:e},t))})}),d={image:"/generated/articles-docs-ai-system-prompt.png",crumb:"AI",title:"Remotion System Prompt for LLMs",sidebar_label:"System Prompt"},l,c={},p=[{value:"System Prompt",id:"system-prompt",level:2},{value:"llms.txt",id:"llmstxt",level:2}];function u(e){let t={a:"a",br:"br",h2:"h2",p:"p",...(0,i.R)(),...e.components},{RawMarkdownCarrier:o}=t;return o||function(e,t){throw Error("Expected "+(t?"component":"object")+" `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}("RawMarkdownCarrier",!0),(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(o,{raw:"---\nimage: /generated/articles-docs-ai-system-prompt.png\ncrumb: 'AI'\ntitle: Remotion System Prompt for LLMs\nsidebar_label: System Prompt\n---\n\nThis is a prompt that you can give to Large Language Models to teach them the mechanics and rules of Remotion.  \nYou can then prompt the LLMs to generate Remotion Code for you.\n\n## System Prompt\n\nimport {SystemPrompt} from '../../components/SystemPrompt';\n\n<SystemPrompt />\n\n## llms.txt\n\nThis file is also hosted under https://www.remotion.dev/llms.txt, as per [convention](https://llmstxt.org).\n"}),"\n",(0,r.jsxs)(t.p,{children:["This is a prompt that you can give to Large Language Models to teach them the mechanics and rules of Remotion.",(0,r.jsx)(t.br,{}),"\n","You can then prompt the LLMs to generate Remotion Code for you."]}),"\n",(0,r.jsx)(t.h2,{id:"system-prompt",children:"System Prompt"}),"\n","\n",(0,r.jsx)(m,{}),"\n",(0,r.jsx)(t.h2,{id:"llmstxt",children:"llms.txt"}),"\n",(0,r.jsxs)(t.p,{children:["This file is also hosted under ",(0,r.jsx)(t.a,{href:"https://www.remotion.dev/llms.txt",children:"https://www.remotion.dev/llms.txt"}),", as per ",(0,r.jsx)(t.a,{href:"https://llmstxt.org",children:"convention"}),"."]})]})}function h(e={}){let{wrapper:t}={...(0,i.R)(),...e.components};return t?(0,r.jsx)(t,{...e,children:(0,r.jsx)(u,{...e})}):u(e)}},69890(e){let t=(e,{target:t=document.body}={})=>{let o=document.createElement("textarea"),n=document.activeElement;o.value=e,o.setAttribute("readonly",""),o.style.contain="strict",o.style.position="absolute",o.style.left="-9999px",o.style.fontSize="12pt";let r=document.getSelection(),i=!1;r.rangeCount>0&&(i=r.getRangeAt(0)),t.append(o),o.select(),o.selectionStart=0,o.selectionEnd=e.length;let s=!1;try{s=document.execCommand("copy")}catch(e){}return o.remove(),i&&(r.removeAllRanges(),r.addRange(i)),n&&n.focus(),s};e.exports=t,e.exports.default=t},93429(e,t,o){o.d(t,{A:()=>m});var n=o(57825),r=o(98426),i=o(69890),s=o.n(i),a=o(67781);let m=({children:e,...t})=>{let o=(0,a.useRef)(null),[i,m]=(0,a.useState)(!1),d=()=>{if(o.current){let e=o.current.querySelector("code div.line")?"code div.line":"div div.line";s()(Array.from(o.current.querySelectorAll(e)).map(e=>e.textContent).join("\n"))}m(!0),setTimeout(()=>m(!1),2e3)},{dangerouslySetInnerHTML:l,...c}=t;return l?(0,n.jsxs)("div",{className:"shiki-container",style:{position:"relative"},children:[(0,n.jsx)("pre",{...c,dangerouslySetInnerHTML:l,ref:o}),(0,n.jsx)("button",{type:"button","aria-label":(0,r.T)({id:"theme.CodeBlock.copyButtonAriaLabel",message:"Copy code to clipboard",description:"The ARIA label for copy code blocks button"}),className:"copy-button",onClick:d,children:i?(0,n.jsx)(r.A,{id:"theme.CodeBlock.copied",description:"The copied button label on code blocks",children:"Copied"}):(0,n.jsx)(r.A,{id:"theme.CodeBlock.copy",description:"The copy button label on code blocks",children:"Copy"})})]}):(0,n.jsxs)("pre",{...t,ref:o,children:[e,(0,n.jsx)("button",{type:"button","aria-label":(0,r.T)({id:"theme.CodeBlock.copyButtonAriaLabel",message:"Copy code to clipboard",description:"The ARIA label for copy code blocks button"}),className:"copy-button",onClick:d,children:i?(0,n.jsx)(r.A,{id:"theme.CodeBlock.copied",description:"The copied button label on code blocks",children:"Copied"}):(0,n.jsx)(r.A,{id:"theme.CodeBlock.copy",description:"The copy button label on code blocks",children:"Copy"})})]})}}}]);