try:
    import docx
    print('OK', docx.__version__)
except Exception as e:
    print('ERROR', type(e).__name__, e)
