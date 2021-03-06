﻿using System;
using Xsv.Sanitize;

namespace Xsv.Test.Sanitize
{
    public class SampleMapper : ISanitizeMapper
    {
        public string Generate(uint hash)
        {
            return "-" + hash.ToString();
        }
    }

    public class NoEmptyConstructorMapper : ISanitizeMapper
    {
        public NoEmptyConstructorMapper(string unused)
        {
            // This mapper can't be loaded by extensibility because an empty ctor is required
        }

        public string Generate(uint hash)
        {
            throw new NotImplementedException();
        }
    }
}
