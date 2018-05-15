import csv
import datetime
import json
import sys


def get_date(text):
    if not text or text == 'MM/DD/YY':
        return None

    date = None
    try:
         date = datetime.datetime.strptime(text, '%m/%d/%y')
    except ValueError:
        try:
            date = datetime.datetime.strptime(text, '%m/%d/%Y')
        except ValueError:
            raise

    return date.date().isoformat()


def get_frame_annotation_rate(text):
    if text == 'Default':
        return 0.1

    if not text.endswith('Hz'):
        raise RuntimeError('unexpected value for "Frame Rate Annotated": %s' % (text))

    return int(text[:-2]) / 30.0


def get_float(text):
    if not text:
        return None

    return float(text)


def get_string(text):
    if not text:
        return None

    return text


def prepare(row):
    stripped = map(lambda x: x.strip(), row)

    # Convert the ID to an int.
    stripped[0] = int(stripped[0])

    # Convert project name, status, annotator, auditor, scene ID, and clip ID to
    # strings.
    stripped[1] = get_string(stripped[1])
    stripped[2] = get_string(stripped[2])
    stripped[3] = get_string(stripped[3])
    stripped[5] = get_string(stripped[5])
    stripped[11] = get_string(stripped[11])
    stripped[12] = get_string(stripped[12])

    # Convert "annotation complete date" to a date object.
    stripped[4] = get_date(stripped[4])
    stripped[6] = get_date(stripped[6])

    # Convert frame count to int.
    stripped[7] = int(stripped[7])

    # Convert the "frame rate annotated" to a fraction of 30Hz.
    stripped[8] = get_frame_annotation_rate(stripped[8])

    # Convert the annotation/audit times to floating point values.
    stripped[9] = get_float(stripped[9])
    stripped[10] = get_float(stripped[10])

    return stripped


def to_dict(row, headers):
    return {k: v for (k, v) in zip(headers, row)}


def annotation_info(stream):
    reader = csv.reader(stream, delimiter=';')

    # Extract the headers.
    headers = reader.next()

    # Check to see if the line begins with a comment marker and excise it if so.
    if headers[0].startswith('#'):
        headers[0] = headers[0][1:]

    # Strip space padding from header names, and dump any "blank" headers (i.e.,
    # those following a terminating delimiter)
    headers = filter(None, map(lambda x: x.strip(), headers))

    # Convert the remaining lines into dicts.
    dicts = map(lambda x: to_dict(prepare(x), headers), reader)

    return list(dicts)


if __name__ == '__main__':
    data = annotation_info(sys.stdin)
    print json.dumps(data, indent=2)
