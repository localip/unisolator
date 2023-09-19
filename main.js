const { patch } = require('#kernel/core/patchers/BrowserWindowPatcher');
const patterns = require('./patterns.json');
const { dialog, app } = require('electron');

function hasArgvFlag(flag) {
	return (process.argv || []).slice(1).includes(flag);
}

const allowMultipleInstances = hasArgvFlag('--multi-instance');
const isFirstInstance = allowMultipleInstances ? true : app.requestSingleInstanceLock();

if (!isFirstInstance && !allowMultipleInstances) {
	app.quit();
} else {
	app.whenReady().then(() => {
		if (!global.__ABORT__) return;

		dialog.showMessageBox({
			type: 'warning',
			title: 'Unisolator',
			message: 'Context is isolated, failed to patch.',
			detail: 'There can be two causes of this.\nEither nullbyte doesn\'t support your platform or nullbyte failed patching memory.\nYour discord will launch in an isolated state.',
			buttons: ['OK']
		});
	});
}

if (patterns[process.platform]?.[process.arch]) {
	try {
		const nullbyte = require(`./nullbyte/nullbyte-${process.platform}-${process.arch}.node`);
		const success = nullbyte.patch(process.pid, patterns[process.platform][process.arch], true);
		if (!success) throw 0;
	} catch (e) {
		global.__ABORT__ = true;
	}

	patch('unisolate', (options) => {
		if (global.__ABORT__) return;

		options.webPreferences ??= {};
		options.webPreferences.contextIsolation = false;
		options.webPreferences.nodeIntegration = true;
	});
}