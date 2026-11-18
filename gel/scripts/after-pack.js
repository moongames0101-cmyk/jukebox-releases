// Sets Gel's icon and name on the Windows .exe (stands in for rcedit, which needs Wine on Linux).
const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  const ResEdit = await import('resedit');
  const R = ResEdit.default || ResEdit;
  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const exe = R.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
  const res = R.NtExecutableResource.from(exe);

  const icon = R.Data.IconFile.from(fs.readFileSync(path.join(__dirname, '..', 'build', 'icon.ico')));
  const groups = R.Resource.IconGroupEntry.fromEntries(res.entries);
  const target = groups[0] || { id: 1, lang: 1033 };
  R.Resource.IconGroupEntry.replaceIconsForResource(res.entries, target.id, target.lang, icon.icons.map(i => i.data));

  const [vi] = R.Resource.VersionInfo.fromEntries(res.entries);
  if (vi) {
    const version = context.packager.appInfo.version.split('.').map(n => parseInt(n, 10) || 0);
    while (version.length < 4) version.push(0);
    const langs = vi.getAllLanguagesForStringValues();
    const lang = langs[0] || { lang: 1033, codepage: 1200 };
    vi.setStringValues(lang, {
      FileDescription: 'Gel',
      ProductName: 'Gel',
      CompanyName: 'Gel',
      InternalName: 'Gel',
      OriginalFilename: 'Gel.exe',
      LegalCopyright: '',
      FileVersion: version.join('.'),
      ProductVersion: version.join('.'),
    });
    vi.setFileVersion(...version);
    vi.setProductVersion(...version);
    vi.outputToResourceEntries(res.entries);
  }
  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
  console.log(`  • Gel: set icon and version info on ${path.basename(exePath)}`);
};
