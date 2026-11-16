"""Read-only gate for the app's required-reason declarations and resource wiring."""
from pathlib import Path
import plistlib
import re

root = Path(__file__).resolve().parent.parent
app = root / "ios/App/App"
project = (root / "ios/App/App.xcodeproj/project.pbxproj").read_text(encoding="utf-8")
with (app / "PrivacyInfo.xcprivacy").open("rb") as file:
    manifest = plistlib.load(file)

categories = manifest.get("NSPrivacyAccessedAPITypes", [])
assert isinstance(categories, list), "Accessed API declarations must be an array"
user_defaults = [entry for entry in categories if entry.get("NSPrivacyAccessedAPIType") == "NSPrivacyAccessedAPICategoryUserDefaults"]
assert len(user_defaults) == 1 and "CA92.1" in user_defaults[0].get("NSPrivacyAccessedAPITypeReasons", []), "Declare app-local UserDefaults usage"

# A file on disk is insufficient: Xcode must copy it into App.app's resources.
reference = re.search(r"([A-F0-9]{24}) /\* PrivacyInfo.xcprivacy \*/ = \{isa = PBXFileReference;[^\n]*path = PrivacyInfo.xcprivacy;", project)
assert reference, "Missing privacy manifest file reference"
build_file = re.search(r"([A-F0-9]{24}) /\* PrivacyInfo.xcprivacy in Resources \*/ = \{isa = PBXBuildFile; fileRef = " + reference[1], project)
assert build_file, "Missing privacy manifest build resource"
resources = project.split("/* Begin PBXResourcesBuildPhase section */")[1].split("/* End PBXResourcesBuildPhase section */")[0]
assert build_file[1] in resources, "Privacy manifest is not included in the resources phase"
group = project.split('504EC3061FED79650016851F /* App */ = {')[1].split('path = App;')[0]
assert reference[1] in group, "Privacy manifest is not in the app source group"
print("PASS iOS app-local UserDefaults declaration and privacy manifest resource membership")
