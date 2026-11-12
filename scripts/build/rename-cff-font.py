# Created by weixi on 2026/11/12.

"""Rename a CFF font for subsetting while preserving outlines and layout tables."""

import sys

try:
    from fontTools.ttLib import TTFont
except ImportError:
    sys.exit("Font generation requires fonttools: python3 -m pip install fonttools")

source, destination, family, style = sys.argv[1:]
font = TTFont(source, recalcTimestamp=False)
full_name = f"{family} {style}"
postscript_name = f"{family.replace(' ', '')}-{style}"
names = {
    1: family,
    2: style,
    3: f"{postscript_name};{font['head'].fontRevision}",
    4: full_name,
    6: postscript_name,
    16: family,
    17: style,
    18: full_name,
    21: family,
    22: style,
}
for record in font['name'].names:
    if record.nameID in names:
        record.string = names[record.nameID].encode(record.getEncoding())

cff = font['CFF '].cff
cff.fontNames = [postscript_name]
for top_dict in cff.topDictIndex:
    top_dict.FamilyName = family
    top_dict.FullName = full_name

font.save(destination)
