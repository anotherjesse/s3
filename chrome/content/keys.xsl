<?xml version="1.0" encoding="UTF-8"?>
<!--
     Copyright Jesse Andrews, 2005-2008
     http://overstimulate.com

     This file may be used under the terms of of the
     GNU General Public License Version 2 or later (the "GPL"),
     http://www.gnu.org/licenses/gpl.html

     Software distributed under the License is distributed on an "AS IS" basis,
     WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
     for the specific language governing rights and limitations under the
     License.
-->

<xsl:stylesheet version="1.0"
                xmlns:S3="http://s3.amazonaws.com/doc/2006-03-01/"
                xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">
  <xsl:for-each select="S3:ListBucketResult/S3:CommonPrefixes">
    <label class="text-link s3">
      <xsl:attribute name="value"><xsl:value-of select="S3:Prefix"/></xsl:attribute>
      <xsl:attribute name="href">/<xsl:value-of select="S3:Prefix"/></xsl:attribute>
    </label>
  </xsl:for-each>
  <xsl:for-each select="S3:ListBucketResult/S3:Contents">
    <label class="text-link s3">
      <xsl:attribute name="value"><xsl:value-of select="S3:Key"/></xsl:attribute>
      <xsl:attribute name="href">/<xsl:value-of select="S3:Key"/></xsl:attribute>
    </label>

  </xsl:for-each>
</xsl:template>

</xsl:stylesheet>

